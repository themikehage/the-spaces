# Plan 38 — Header "delegated by" en delegaciones (delegador como link)

**Estado:** 🔜 Pendiente de implementar — diseño aprobado

## Objetivo

Que cada delegación muestre un header mínimo del tipo:

```
delegated by — [delegador] — [task]
```

donde **el nombre del delegador es un link** (navega al agente/entidad que delegó).

## Contexto

Hoy el modelo de delegación no registra quién delega. `PendingDelegation` solo tiene el **destino**:

- `apps/server/src/core/delegation/delegation-registry.ts:7-18` — `targetType` (`spawn`/`delegate`), `targetLabel` (subagente/objetivo), `task`, `parentSessionId`, `subagentSessionId`. No hay campo de "delegador".
- `packages/shared/src/schemas.ts:716-728` — `PendingDelegationSchema` replica lo mismo.

El delegador es el **agente que corre la sesión padre** (`parentSessionId`). Esa identidad ya se resuelve parcialmente en `manage-delegations.tool.ts:182-184` vía `resolveParentRef(parentMeta)` → `parentEntityType` + `parentEntityId`, pero no se persiste en la delegación.

## Diseño

### 1. Añadir identidad del delegador al modelo

Agregar campos opcionales a `PendingDelegation` (server + shared schema):

- `delegatorName: string` — nombre legible del delegador (agente/proyecto/team, o "You" para global).
- `delegatorId?: string` — id de la entidad delegadora (para armar el link).
- `delegatorEntityType?: "agent" | "project" | "team" | "global"` — para decidir el destino del link.

Son opcionales → las delegaciones persistidas viejas siguen parseando (migración cero). El header se renderiza solo si `delegatorName` existe; si no, se omite (retrocompatibilidad).

### 2. Resolución del delegador al registrar

En `apps/server/src/core/tools/extensions/manage-delegations.tool.ts` (ramas `spawn` ~302-318 y `delegate` ~408+) y `apps/server/src/core/session/spawn-subagent.ts`:

- Reusar `resolveParentRef(parentMeta)` para obtener `type` + `id`.
- Resolver el **nombre**:
  - `agent` → `activeAgentRegistry.get(id)?.name` (o la definición del agente).
  - `project` / `team` → nombre desde el registro/metadata correspondiente.
  - `global` → `"You"` (el usuario delegó directamente, sin agente).
- Escribir `delegatorName`/`delegatorId`/`delegatorEntityType` en el objeto que se pasa a `delegationRegistry.register(...)`.

### 3. Propagación por WS

`apps/server/src/core/delegation/delegation-registry.ts:20-35` — `DelegationEvent["delegation_started"]`: añadir `delegatorName`, `delegatorId?`, `delegatorEntityType?` para que el cliente los reciba en vivo (hoy `DelegationsPanel` construye el item desde el evento WS, líneas 84-102).

### 4. Frontend — header "delegated by [delegador] — [task]"

**Chat (tool call cards)** — `apps/client/src/components/chat/tools/ToolResultRouter.tsx`, casos de delegación:

- `manage_delegations` (110-139), `spawn_subagent` (140-157), `delegate_task` (158-183).
- Añadir una línea de header compacta encima del `task` actual:
  - `delegated by` (label gris) → `[delegatorName]` como `<Link>` (acento/nav) → `—` → `task` truncado.
- Link del delegador:
  - `agent` → `/agents/:delegatorId`
  - `project` → `/projects/:delegatorId`
  - `team` → `/teams/:delegatorId`
  - `global` o sin id → texto plano (no link).
- El delegador se obtiene del `result.details` (ver §5) o, como fallback, del contexto ya disponible (`activeAgentId`/`activeAgent`).

**Panel** — `apps/client/src/components/chat/DelegationsPanel.tsx`:
- En las cards de la lista (216-263), agregar línea "delegated by [delegador](link) — task" reemplazando/aumentando el `<h3>{d.task}</h3>` (234-236).
- En el detalle (split screen), agregar el delegador en la sección de cabecera.
- El WS subscription (84-120) debe copiar `delegatorName`/`delegatorId`/`delegatorEntityType` al construir el item.
- Reusar el helper de ruta existente `getSessionPath` (33-42) para el link del delegador.

**Floating** — `apps/client/src/components/chat/FloatingDelegations.tsx`:
- En cada fila (43-65), anteponer "delegated by [delegador](link)" al `task` actual (54).

### 5. Devolver delegator en el resultado del tool

`manage-delegations.tool.ts` ya devuelve `details: { status, subagentSessionId, task }` (spawn ~406). Añadir `delegatorName`/`delegatorId`/`delegatorEntityType` a ese `details` para que `ToolResultRouter` lo lea directamente sin depender del WS/contexto.

## Verificación

- `pnpm build` (o typecheck de server y client).
- Crear una delegación desde un agente → en el chat el tool card muestra "delegated by [agente] — task", y el nombre del agente es un link que navega a `/agents/:id`.
- Delegación global (sin agente) → muestra "delegated by You" sin link.
- Delegación persistida vieja (sin `delegatorName`) → no rompe; se omite el header.
- `DelegationsPanel` y `FloatingDelegations` reflejan el mismo header, incluyendo delegaciones que llegan por WS en vivo y las cargadas por `fetchSessionDelegations`.

## Archivos implicados

- `apps/server/src/core/delegation/delegation-registry.ts` — `PendingDelegation` + `DelegationEvent` (campos de delegador).
- `apps/server/src/core/tools/extensions/manage-delegations.tool.ts` — resolución del delegador + `register()` (spawn/delegate) + `details` de retorno.
- `apps/server/src/core/session/spawn-subagent.ts` — `register()` con delegador.
- `packages/shared/src/schemas.ts` — `PendingDelegationSchema` (campos opcionales).
- `apps/client/src/components/chat/tools/ToolResultRouter.tsx` — header en los 3 casos de delegación.
- `apps/client/src/components/chat/DelegationsPanel.tsx` — header en lista + detalle + WS mapping.
- `apps/client/src/components/chat/FloatingDelegations.tsx` — header en filas.
