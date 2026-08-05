# Hito 1: Puertos Core, ToolExecutor y AgentRuntime Adapter

> **Estado:** ✅ Completado
> **Objetivo:** Definir las abstracciones puras en `core/ports/`, implementar la cadena de ejecución `ToolExecutor` y crear la clase `AgentRuntime` como un adaptador desacoplado del motor.

---

## 1. Alcance Realizado

1. **Puertos Core Puros (`core/ports/`)**:
   - `IAgentRuntime`: Contrato estándar para el runtime del agente.
   - `IToolExecutor` + `ToolCallExecution`: Definición de ejecución desacoplada de herramientas.
   - `IToolRegistry` + `LLMToolDefinition`: Registro de herramientas con exportación a formato LLM agnóstico.
   - `IHookRunner`: Cadena de middleware con `beforeToolCall`, `afterToolCall` y `onError`.
   - `IPermissionEngine`: Evaluador declarativo de políticas.
   - `IEventBus`: Bus de eventos tipado (`TypedEventEmitter`).

2. **Ejecutor de Herramientas (`core/tool-executor.ts`)**:
   - Orquestación en secuencia: Evaluación de reglas $\rightarrow$ Hook `beforeToolCall` $\rightarrow$ Ejecución de `ITool` $\rightarrow$ Hook `afterToolCall`.

3. **Runtime Adaptador (`ai/agent-runtime.ts`)**:
   - Implementación de `IAgentRuntime` en 111 líneas (cumpliendo la regla `< 200 líneas`).
   - Patrón **Adapter / Strategy** con la interfaz inyectable `AgentEngineAdapter`.

---

## 2. Archivos Creados / Modificados

- `apps/server/src/core/ports/agent-runtime.port.ts`
- `apps/server/src/core/ports/tool-executor.port.ts`
- `apps/server/src/core/ports/tool.port.ts`
- `apps/server/src/core/ports/hook.port.ts`
- `apps/server/src/core/ports/permission.port.ts`
- `apps/server/src/core/tool-executor.ts`
- `apps/server/src/core/tool-registry.ts`
- `apps/server/src/ai/agent-runtime.ts`
- `apps/server/src/ai/index.ts`

---

## 3. Criterio de Verificación

- `pnpm --filter server run typecheck`: **0 errores**.
- `pnpm build`: **Build de producción exitoso**.
