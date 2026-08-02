# Hito 6: Client — API Layer + Hooks Base — ✅ [COMPLETADO]

> Extraído de `plans/15-core-architecture-migration.md` para planificación e implementación detallada.

**Objetivo**: cliente con capa API tipada y hooks base adaptados a los contratos del nuevo engine (`@spaces/core`). Sin romper la UI existente.

---

## API Layer (`src/api/`)

| Tarea                                        | Archivo                         | Estado |
| -------------------------------------------- | ------------------------------- | ------ |
| `apiFetch` wrapper tipado + `ApiError`       | `apps/client/src/api/client.ts` | ✅     |
| `WsClient` adaptado a `AgentEvent` de engine | `apps/client/src/api/ws.ts`     | ✅     |

---

## Hooks Base (`src/hooks/`)

| Tarea                                                                   | Archivo                                 | Estado |
| ----------------------------------------------------------------------- | --------------------------------------- | ------ |
| `useWebSocket` (auto-subscribe por sessionId + overloads engine/legacy) | `apps/client/src/hooks/useWebSocket.ts` | ✅     |
| `useSessions` (CRUD: list, create, remove, select)                      | `apps/client/src/hooks/useSessions.ts`  | ✅     |
| `useChat` (messages, streaming, send, abort)                            | `apps/client/src/hooks/useChat.ts`      | ✅     |

---

## Verificación

- `pnpm --filter @spaces/client typecheck` → 0 errores
- `pnpm typecheck` (workspace completo) → 0 errores

---

## Plan de Implementación Detallado

Ver: `implementation_plan.md` en artefactos de conversación (`f10a28aa-b06b-4ffc-b2cf-3d425e2ea6de`).
