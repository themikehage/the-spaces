# Plan 17 — Eliminar `ai/vendor/` y `AgentSession` (COMPLETADO)

> **Estado:** Completado exitosamente.

## Resumen de Cambios

1. **Eliminación física de `ai/vendor/`**: Se borró completamente el directorio `ai/vendor/` (~702 KB, 70+ archivos).
2. **Eliminación física de `ai/agent-session.ts`**: Se eliminó el god object `AgentSession` (862 líneas).
3. **Eliminación de tests legacy obsoletos**: Se borró `__tests__/agent-session.test.ts`.
4. **Desacoplamiento de importadores del vendor**:
   - `core/navigation-controller.ts`: desacoplado del tipo `Agent` del vendor.
   - `core/tool-registry.ts`: desacoplado del tipo `AgentTool` del vendor.
   - `core/tools/vision-tool.ts`: removido import de vendor `compat.ts`.
   - `core/tools/image-gen-tool.ts`: removidos imports de vendor `image-models.ts` e `images.ts`.
   - `teams/team-prompt-runner.ts`: removido import de vendor `compat.ts`.
   - `ai/compaction-manager.ts`, `ai/context-estimator.ts`, `ai/messages.ts`, `ai/session-persistence.ts`, `ai/skill-loader.ts`, `ai/tools/ls-tool.ts`, `ai/tools/read-tool.ts`: limpiados todos los imports a `ai/vendor/`.
5. **Desacoplamiento de importadores de `AgentSession`**:
   - `ai/index.ts`: eliminados re-exports de `AgentSession` y `AgentSessionEvent`.
   - `core/ports/core-services.port.ts`: reemplazado `AgentSession` por `IAgentRuntime` de `@spaces/core`.
   - `core/session/agent-runtime.ts`: desacoplado de `createAgentSession` / `AgentSession`, integrado con `IAgentRuntime`.
   - `core/session/mcp-attach.ts`, `session-event-publisher.ts`, `session-memory-enricher.ts`, `pipeline-engine.ts`, `agents/types.ts`: desacoplados de `AgentSession`.
   - `core/session-manager.ts`: eliminados imports de `AgentSession` de `ai`.

## Verificación

- `grep_search` para `ai/vendor`: **0 resultados**.
- `grep_search` para `import ... AgentSession`: **0 resultados**.
- `pnpm --filter server run typecheck`: **0 errores**.
