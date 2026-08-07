# Plan 26 — Agentes Definidos por Equipo (Carpeta `agents/`)

**Estado:** 🔜 Análisis — sin implementar

## Contexto

Idea: que los **teams** puedan definir sus propios agentes mediante una carpeta `agents/` dentro de su espacio, donde cada subcarpeta representa un agente (`agents/<nombre>/)` y cada una contiene su propia `config`.

## Estado actual relevante

- Los agentes **ya se persisten como archivos**, no en SQLite: `users/<username>/agents/<id>/` con `definition.json` y `workspace/.spaces/AGENTS.md` (`apps/server/src/agents/agent-registry.ts:28`, `packages/shared/src/paths.ts:16`).
- Cada entidad ya tiene **workspace propio en disco**: proyecto `users/<u>/projects/<id>/workspace`, agente `.../agents/<id>/workspace`, equipo `.../teams/<id>/workspace` (`paths.ts:60,76,96`).
- Existe **config en cascada por entidad** `global → team/project → agent` vía `CascadeConfigLoader` (`apps/server/src/core/config/cascade-config-loader.ts:19`) + `.spaces/config.json`, con puerto `WorkspaceConfigPort` (`core/ports/workspace-config.port.ts:6`) y endpoints `GET/PUT /api/config/:entityType/:entityId` (`routes/config.ts`).
- Existe la forma declarativa `SpacesAgentConfigSchema` (`packages/shared/src/schemas.ts:887`) — `name`, `model`, `instruction`, `tools[]`, `skills[]`, `memory`, `workspaceDir`, etc.
- `AgentRegistry.init()` escanea el disco al arrancar y registra agentes desde `definition.json` (`agent-registry.ts:36`).

## Análisis

### Puntos fuertes

- **Encaje natural con lo existente:** cada agente ya es una carpeta con su config. Colocar esa carpeta *dentro del workspace del team* es una extensión mínima de `getTeamWorkspaceDir`.
- **Config en cascada gratis:** un `agents/` en el workspace del equipo alimenta la cadena `global → team → agent` ya implementada.
- **Equilibra "agente por UI" vs "agente como código":** añade una vía files-first declarativa, coherente con `.spaces/config.json`.

### Tensiones / riesgos

- **Dos fuentes de verdad para "agente":** agentes globales (fuera, `users/<u>/agents/`) vs agentes declarativos dentro del workspace del team. Riesgo de duplicidad de modelos (`AgentDefinitionSchema` vs carpeta `config.json`).
- **Decisión de diseño clave:** ¿la carpeta `agents/<nombre>` *es* un `AgentDefinition`, o es una `EntityConfig`/`SpacesAgentConfig` scoped al team? Recomendación: **reusar `SpacesAgentConfigSchema`** como config declarativa, sin inventar un modelo nuevo.
- **Espacios de nombres y resolución:** `resolveWorkspace` prioriza `teamId > projectId > agentId` (`cascade-config-loader.ts:37-55`); hay que decidir anidamiento y colisiones con `agents/<id>` global.
- **Migración / retrocompat:** `AgentRegistry.init()` debe escanear también los `agents/` de cada workspace de team/proyecto o resolverlos on-demand.

## Recomendación

Declarar a los agentes de team como **config declarativa** reusando `SpacesAgentConfig`, no como nueva entidad, para no bifurcar el modelo de agente. Definir transición/prioridad entre "agente de team en carpeta" y "agente global" antes de implementar.
