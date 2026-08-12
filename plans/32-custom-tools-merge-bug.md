# Plan 32 — Bug: añadir una custom tool hace que el agente pierda todas las demás tools

**Estado:** 🔜 Pendiente de implementar — diagnóstico completado

## Síntoma

Al crear/activar una custom tool (`manage_custom_tools` o UI), **en la misma sesión y turno funciona bien**. Pero en el siguiente mensaje (`prompt`), el agente pierde acceso a todas sus tools del sistema (read, write, edit, bash, grep, find, ls...) y solo le aparece la custom tool.

## Causa raíz

El handler WebSocket de `prompt` **reemplaza** el array completo `session.customTools` por solo las folder custom tools, en vez de fusionarlo con los tools del sistema:

- `apps/server/src/ws/handlers/session.handler.ts:95-101` — en cada `prompt`, `resolveCustomToolsForSession` devuelve solo los runtime de carpetas custom y se asignan con `(session as any).customTools = resolvedBaseTools` (reemplazo total). Los tools del sistema no están en `resolvedBaseTools`.
- `apps/server/src/core/session/agent-session.ts:205-290` (`_refreshToolRegistry`) — hace `this.toolRegistry.clear()` y re-registra solo el array reemplazado. La reconstrucción de `activeTools` (líneas 269-282) mapea los nombres activos previos contra el registry vacío de system tools → `filter(Boolean)` los descarta. `agent.state.tools` queda `[custom_tool]`.

### Por qué "en la sesión donde se añade va bien"

Los demás paths sí fusionan por nombre:
- Upsert in-session: `apps/server/src/core/custom-tools/manage-custom-tools-tool.ts:147-155` (filtra el nombre y agrega, conservando el resto).
- Bootstrap: `apps/server/src/core/session/agent-runtime.ts:252-259` (merge correcto del mismo patrón).

Solo el path del WS reemplaza.

## Plan de fix

1. `session.handler.ts:96-97`: fusionar `resolvedBaseTools` sobre el array existente por nombre (mismo patrón que `agent-runtime.ts:255-258` y `manage-custom-tools-tool.ts:147-151`), nunca reemplazar.
2. Defensivo en `_refreshToolRegistry` (`agent-session.ts:269-282`): reconstruir `activeTools` solo con nombres presentes en el nuevo registry (no confiar en `prevActiveNames` tras `clear()`).

## Riesgos secundarios (misma clase)

- `routes/sessions.ts:900` persiste la lista cliente raw sin mergear (`persistSessionTools`), y `metadata-store.ts:71-138` la devuelve tal cual en el próximo bootstrap.
- `config-merger.ts:22-29`: `toolOverrides.add` de entidad hija **reemplaza** el del padre (last-write-wins, no aditivo).
- `resolver.ts:31` (`resolveCustomToolsForSession`): si `addList` no vacío, oculta folder tools no listadas.

## Verificación

- Test: sesión con factory tools → registrar custom tool vía `manage_custom_tools` → siguiente `prompt` → confirmar `getActiveToolNames()` conserva read/write/edit/bash/grep/find/ls + custom.

## Archivos implicados

- `apps/server/src/ws/handlers/session.handler.ts`
- `apps/server/src/core/session/agent-session.ts` (`_refreshToolRegistry`)
- `apps/server/src/core/custom-tools/resolver.ts`
- `apps/server/src/routes/sessions.ts` (`POST /:id/tools`)
- `apps/server/src/core/config/config-merger.ts`