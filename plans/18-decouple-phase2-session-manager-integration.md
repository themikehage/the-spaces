# Hito 2: Integración de AgentRuntime en SessionManager y Reducción de AgentSession

> **Estado:** 🔜 Próximo
> **Objetivo:** Conectar `AgentRuntime` como la clase runtime concreta en `SessionManager` y achicar el God Object `AgentSession` a un delgado adaptador de interfaz (~120 líneas).

---

## 1. Contexto y Diagnóstico

Actualmente `AgentSession` (797 líneas) concentra:
- Inicialización del vendor `Agent`.
- Refresco manual de registro de herramientas (`_refreshToolRegistry`).
- Lógica de prompt building, compactación y navegación.
- Estado interno de streaming y mensajes.

## 2. Plan de Trabajo

1. **Actualizar `SessionManager` (`core/session-manager.ts`)**:
   - Modificar `getOrCreateSession` para instanciar y retornar `AgentRuntime` mediante la fábrica de runtime.
   - Retornar la abstracción `IAgentRuntime` hacia las rutas REST y controladores WebSocket.

2. **Refactorizar `AgentSession` (`ai/agent-session.ts`)**:
   - Convertir `AgentSession` en un *thin adapter/bridge* que delegue a `AgentRuntime`.
   - Bajar el número de líneas de 797 a ~120 líneas.
   - Eliminar métodos duplicados de refresco de herramientas y manipulación directa de `agent.state`.

3. **Actualización de Consumidores**:
   - Asegurar que `apps/server/src/routes/sessions.ts` y `apps/server/src/ws/handler.ts` interactúen exclusivamente con métodos definidos en `IAgentRuntime`.

---

## 3. Criterio de Verificación

- `pnpm --filter server run typecheck`: **0 errores**.
- Pruebas de integración de servidor y WebSocket streaming funcionando sin regresiones.
