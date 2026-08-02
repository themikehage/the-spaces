# Plan 15 — Hito 2: Engine — AgentRuntime (Completado)

> **Estado**: ✅ Completado  
> **Fecha**: 2026-08-02

---

## Resumen de Lo Realizado

Se completó la implementación del paquete `@spaces/engine` (`@spaces/engine`), desacoplado de dependencias vendor y basado enteramente en los contratos de `@spaces/core`:

1. **`EventBus` (`src/event-bus.ts`)**:
   - Implementación pura de `IEventBus<AgentEvent>` basada en Map de Set handlers.
   - Soporta subscripciones fuertemente tipadas y desuscripciones vía función de retorno.
2. **`PromptBuilder` (`src/prompt-builder.ts`)**:
   - Pipeline de `PromptSection[]` ordenado por prioridad.
   - Evaluación condicional por sección y ensamblado asíncrono.
3. **`HookRunner` (`src/hook-runner.ts`)**:
   - Middleware chain para `beforeToolCall`, `afterToolCall`, `onError`.
   - Soporta short-circuit / bloqueo cuando un hook retorna `null`.
4. **`PermissionEngine` (`src/permission-engine.ts`)**:
   - Evaluador declarativo de reglas de permiso (`Rule[]`).
5. **`ToolRegistry` & `ToolExecutor` (`src/tool-executor.ts`)**:
   - Registro tipado de tools y formateo automático a esquema de LLM.
   - Ejecución segura con parseo Zod de argumentos, pre-evaluación de permisos y ejecución de hooks.
6. **`runAgentLoop` (`src/agent-loop.ts`)**:
   - Motor de bucle interactivo LLM ↔ Tools desacoplado del vendor.
   - Manejo de streaming delta, llamadas a herramientas en paralelo (`Promise.all`) y control de abortos via `AbortSignal`.
7. **`AgentRuntime` (`src/agent-runtime.ts`)**:
   - Orquestador principal que implementa `IAgentRuntime`.
   - Maneja el ciclo de vida de las sesiones, almacenamiento de mensajes via `ISessionStore` y emisión de eventos.
8. **`createAgent` Factory (`src/factories/default.agent.ts`)**:
   - Factory para instanciar `AgentRuntime` inyectando dependencias por defecto.
9. **Barrel Export (`src/index.ts`)**:
   - Re-exportación completa de todos los submódulos.

---

## Verificaciones Ejecutadas

- **Typecheck**: `pnpm --filter @spaces/engine typecheck` → 0 errores.
- **Build**: `pnpm --filter @spaces/engine build` → exitoso.
- **Integridad**: Todos los archivos < 300 líneas (máximo: 114 líneas), cero singletons, cero `any`.
