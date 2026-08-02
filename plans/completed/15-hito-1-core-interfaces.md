# Plan 15 — Hito 1: Core — Interfaces Puras (Completado)

> **Estado**: ✅ Completado  
> **Fecha**: 2026-08-01

---

## Resumen de Lo Realizado

Se completó el paquete `@spaces/core` con la totalidad de los puertos, tipos y schemas Zod sin implementaciones ni dependencias externas salvo Zod:

1. **Tipos y Contextos Base (`src/types.ts`)**:
   - `AgentMessage`, `LLMMessage`, `ToolCall`, `ToolResult`, `MessageDelta`, `ContextUsage`, `ContentBlock`
   - `AgentContext`, `ToolContext`, `ToolCallContext`, `PromptContext`, `RuleContext`, `AgentError`
2. **Sistema de Eventos Discriminados (`src/events.ts`)**:
   - `AgentEvent` discriminado por `type` (`agent_start`, `agent_end`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_end`, `agent_error`).
3. **Ports / Interfaces Puras (`src/ports/`)**:
   - `IEventBus` (`event-bus.port.ts`)
   - `IModelProvider`, `StreamCompleteOptions` (`model.port.ts`)
   - `ITool`, `IToolRegistry`, `IToolExecutor`, `LLMToolDefinition` (`tool.port.ts`)
   - `PromptSection`, `IPromptBuilder` (`prompt.port.ts`)
   - `Hook`, `IHookRunner` (`hook.port.ts`)
   - `Rule`, `RuleResult`, `IPermissionEngine` (`permission.port.ts`)
   - `ISessionStore`, `SessionData`, `MessageRecord` (`session.port.ts`)
   - `ISandbox`, `SandboxOptions`, `SandboxResult` (`sandbox.port.ts`)
   - `IWorkspaceProvider`, `WorkspaceSyncTarget` (`workspace.port.ts`)
   - `IMemoryProvider`, `MemoryEntry` (`memory.port.ts`)
   - `IAgentRuntime`, `AgentRuntimeDependencies` (`agent.port.ts`)
4. **Schemas Zod (`src/schemas/`)**:
   - `MessageSchema`, `MessageRoleSchema` (`message.schema.ts`)
   - `SessionSchema`, `CreateSessionSchema` (`session.schema.ts`)
   - `ToolCallSchema`, `ToolResultSchema` (`tool.schema.ts`)
5. **Barrel Export (`src/index.ts`)**:
   - Re-exportación completa y limpia del paquete `@spaces/core`.

---

## Verificaciones Ejecutadas

- **Typecheck**: `pnpm --filter @spaces/core typecheck` pasa en 0 errores.
- **Build**: `pnpm --filter @spaces/core build` compila limpiamente (`tsc`).
