# Plan 36 — Campo `tag` en entidades (agentes, proyectos, teams, workflows) para agrupación futura

**Estado:** ✅ Completado — resuelto e implementado en cliente, servidor y schemas compartidos

## Objetivo

Añadir un campo opcional `tag` a las definiciones persistidas de las 4 entidades — agentes, proyectos, teams y workflows — para poder agruparlas/filtrarlas en el futuro (UI de agrupación/filtro).

## Cambios

El campo debe fluir por el schema, el store/ruta del server, el servicio API del cliente y el formulario de cada entidad. Es opcional en todos los lados → las definiciones existentes siguen validando sin migración.

### 1. Schemas compartidos (`packages/shared`)

Añadir `tag: z.string().max(64).optional()` en:

- `packages/shared/src/schemas.ts:261-278` (`AgentDefinitionSchema`).
  - ⚠️ Nota: el agente ya tiene `tags: z.array(z.string()).optional()` (línea 273). Decidir si se reutiliza `tags` o se añade un `tag` singular consistente con el resto. Recomendado: un único `tag` singular para las 4 entidades, manteniendo `tags` por retrocompatibilidad.
- `packages/shared/src/schemas.ts:631-648` (`TeamSchema`) y `651-666` (`CreateTeamSchema`); `UpdateTeamSchema` (669-672) lo hereda vía `.partial()`.
- `packages/shared/src/schemas.ts:859-867` (`ProjectSchema`).
- `packages/shared/src/workflows.ts:105-119` (`WorkflowDefinitionSchema`).

### 2. Stores y rutas del server (persistencia)

Incluir `tag` en el objeto que se escribe a disco (ya validan contra el schema, por lo que si el schema lo acepta, basta con propagarlo en el mapeo/construcción):

- **Agentes** — `apps/server/src/agents/agent-registry.ts` (`register` ~121-135 y `update`): el `definition.json` ya serializa `definition`, así que solo hay que asegurar que `tag` no se descarte.
- **Teams** — `apps/server/src/teams/team-store.ts` (`createTeam` 47-72, `updateTeam` 123-144): añadir `tag: data.tag` y `if (updates.tag !== undefined) team.tag = updates.tag;`.
- **Proyectos** — `apps/server/src/routes/files.ts` (POST `371-440`, PATCH `478-...`): añadir `tag` al `projectJson` de creación y al patch (línea ~530s).
- **Workflows** — `apps/server/src/core/workflows/workflow-store.ts` (`save` 21-41): ya escribe `validated` completo, así que `tag` fluye solo si el schema lo acepta.

### 3. Servicios API del cliente

Propagar `tag` en los tipos/payloads:

- `apps/client/src/lib/api/agents.service.ts` (create/update).
- `apps/client/src/lib/api/teams.service.ts` (create/update).
- `apps/client/src/lib/api/projects.service.ts` (`createProject` 11-28, `updateProject` 30-38).
- `apps/client/src/lib/api/workflows.service.ts` (`saveWorkflow` 21-35) — tipos ya derivados de `WorkflowDefinition`, revisar si hace falta.

### 4. Formularios editor

Añadir input opcional `tag` (texto, max 64) en cada formulario:

- **Agentes** — `apps/client/src/components/agents/RegisterModal.tsx` (estado `form`, `DEFAULT_FORM` ~13).
- **Teams** — `apps/client/src/components/teams/TeamCreateModal.tsx` y `TeamSettingsModal.tsx`.
- **Proyectos** — `apps/client/src/pages/DashboardModals.tsx` (`CreateProjectModal` ~23-113).
- **Workflows** — `apps/client/src/pages/WorkflowsListPage.tsx` (creación de `newWf` ~35).

### 5. Display (opcional, preparar agrupación)

Chip pequeño `tag` en las listas/tarjetas de cada entidad (sin lógica de filtro/agrupación todavía):

- `apps/client/src/components/agents/AgentCard.tsx`
- `apps/client/src/components/teams/TeamCard.tsx`
- `apps/client/src/pages/ProjectsPage.tsx` (o el listado de proyectos correspondiente)
- `apps/client/src/pages/WorkflowsListPage.tsx`

## Verificación

- `pnpm build` o `pnpm --filter server run typecheck` + `pnpm --filter client run typecheck`.
- Crear/editar una entidad de cada tipo con y sin `tag` → `definition.json` / `project.json` / `team.json` y las listas lo reflejan.

## Archivos implicados

- `packages/shared/src/schemas.ts` (Agent, Team, Project)
- `packages/shared/src/workflows.ts` (Workflow)
- `apps/server/src/agents/agent-registry.ts`
- `apps/server/src/teams/team-store.ts`
- `apps/server/src/routes/files.ts`
- `apps/server/src/core/workflows/workflow-store.ts`
- `apps/client/src/lib/api/{agents,teams,projects,workflows}.service.ts`
- `apps/client/src/components/agents/RegisterModal.tsx`
- `apps/client/src/components/teams/TeamCreateModal.tsx`, `TeamSettingsModal.tsx`
- `apps/client/src/pages/DashboardModals.tsx`, `ProjectsPage.tsx`, `WorkflowsListPage.tsx`
