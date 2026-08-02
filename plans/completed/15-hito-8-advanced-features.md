# Hito 8: Migración de Features Avanzados — ✅ [COMPLETADO]

> Extraído de `plans/15-core-architecture-migration.md` para planificación e implementación detallada.

**Objetivo**: migrar features existentes a la nueva arquitectura sin romper funcionalidad.

---

## Subsistemas Implementados

### 8a — MCP Integration
- `McpToolAdapter` (`packages/tools/src/mcp/mcp-tool-adapter.ts`) implementa `ITool`
- `McpServerConnector` (`packages/tools/src/mcp/mcp-server-connector.ts`) maneja lifecycle de servidores MCP
- `McpRegistry` (`packages/tools/src/mcp/mcp-registry.ts`) expone registro de servidores y herramientas
- `McpAuditHook` (`packages/tools/src/mcp/mcp-audit-hook.ts`) para auditoría/logging de ejecuciones MCP
- Integrado en `AppContext` en `apps/server/src/context.ts`

### 8b — Approvals
- `IApprovalChannel` (`packages/core/src/ports/approval.port.ts`)
- `ApprovalHook` (`packages/engine/src/hooks/approval-hook.ts`) implementa `Hook.beforeToolCall` y retorna `null` si deniega
- `WsApprovalChannel` (`apps/server/src/approvals/ws-approval-channel.ts`) expone canal de WS para resolver aprobaciones

### 8c — Schedules
- `IScheduleService` (`packages/core/src/ports/schedule.port.ts`)
- `ScheduleService` (`apps/server/src/schedules/schedule.service.ts`) como dependencia inyectable

### 8d — Teams / Multi-agent
- `DelegationHook` (`packages/engine/src/hooks/delegation-hook.ts`) implementa `Hook` para interceptar delegación
- `TeamContext` (`apps/server/src/teams/team-context.ts`) para gestión de sub-agentes
- `createTeamAgent()` (`apps/server/src/teams/team-agent.factory.ts`) factory para componer múltiples `AgentRuntime`

### 8e — Memory / RAG
- `MemoryPromptSection` (`packages/engine/src/prompt-sections/memory-prompt-section.ts`) implementa `PromptSection` (priority 30)
- `EngramMemoryProvider` (`apps/server/src/memory/engram-memory-provider.ts`) implementa `IMemoryProvider`

### 8f — Custom Tools
- `CustomToolAdapter` (`packages/tools/src/custom/custom-tool-adapter.ts`) implementa `ITool`
- `CustomToolLoader` (`apps/server/src/custom-tools/custom-tool-loader.ts`) para carga de herramientas por entidad

---

## Verificación

- `pnpm --filter @spaces/tools typecheck` → 0 errores
- `pnpm typecheck` (workspace completo) → 0 errores
- Todos los componentes y hooks cumplen con las restricciones de desacoplamiento, inyección de dependencias y ausencia de singletons.
