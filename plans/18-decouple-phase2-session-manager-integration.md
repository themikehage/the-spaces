# Hito 2: Integración de AgentRuntime en SessionManager y Reducción de AgentSession

> **Estado:** ✅ Completado
> **Objetivo:** Conectar `AgentRuntime` como el runtime concreto en `SessionManager` y achicar el God Object `AgentSession` a un delgado adaptador de fachada (~120 líneas).

---

## 1. Visión y Meta (A dónde se quiere llegar)

Alinear el backend con el principio **"El Agente es Composición"** de `out/auto-browser/PLAN.md`. El `SessionManager` no debe depender de una clase monolítica de 797 líneas (`AgentSession`), sino gestionar instancias de `IAgentRuntime` que reciben sus dependencias compuestas e inyectadas por constructor (`IToolExecutor`, `IHookRunner`, `IPermissionEngine`, `IPromptBuilder`).

---

## 2. Motivación y Por Qué (Por qué se hace este ajuste)

- **Eliminar el God Object principal**: `AgentSession` acumulaba refresco de herramientas, prompt building, compactación, navegación y la invocación directa al vendor.
- **Inversión de Dependencias (DIP)**: `SessionManager`, las rutas REST (`routes/sessions.ts`) y los controladores WebSocket (`ws/handler.ts`) deben depender exclusivamente de la interfaz pura `IAgentRuntime`.
- **Preparar la arquitectura para motores intercambiables**: Al desligar las sesiones de una clase concreta, se puede cambiar el motor interno sin tocar las rutas ni los clientes.

---

## 3. Plan de Trabajo Paso a Paso

1. **Actualizar `SessionManager` (`core/session-manager.ts`)**:
   - Modificar `getOrCreateSession` para que devuelva `IAgentRuntime`.
   - Utilizar `AgentRuntime` (que envuelve la estrategia del motor) como la implementación concreta interna.

2. **Descomponer y Achicar `AgentSession` (`ai/agent-session.ts`)**:
   - Convertir `AgentSession` en una fachada/bridge delgada (~120 líneas) que implemente `IAgentRuntime` delegando las llamadas a `AgentRuntime`.
   - Eliminar métodos duplicados de refresco de herramientas y mutación directa de estado (`_refreshToolRegistry`).

3. **Refactorizar Consumidores en Rutas y WebSocket**:
   - Asegurar que `routes/sessions.ts`, `ws/handler.ts` y `teams/` consuman solo métodos de `IAgentRuntime`.

---

## 4. Consideraciones Anti-Regresión (Para evitar romper nada)

> [!WARNING]
> **Compatibilidad con WebSocket Streaming**: El cliente React y los clientes WS escuchan eventos como `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_end`. `AgentRuntime` debe re-emitir exactamente los mismos nombres y formas de eventos mediante `TypedEventEmitter`.

> [!IMPORTANT]
> **Propiedades de Estado en Transición**: El frontend/rutas consultan `isStreaming` y `messages`. Garantizar que `IAgentRuntime.isStreaming` y `IAgentRuntime.getMessages()` devuelvan valores consistentes durante todo el flujo.

> [!CAUTION]
> **Fábrica de Subagentes y Delegaciones**: La delegación entre agentes (`manage-delegations-tool.ts`) invoca `sessionManager.getOrCreateSession`. La firma y el comportamiento de retorno deben ser 100% compatibles con la interfaz `IAgentRuntime`.

---

## 5. Criterio de Verificación

- `pnpm --filter server run typecheck`: **0 errores de compilación**.
- `pnpm build`: **Build de producción exitoso**.
- Pruebas manuales/automatizadas de WebSocket streaming y creación de sesiones pasadas con éxito.
