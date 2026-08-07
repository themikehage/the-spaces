# Plan 29 — Workflow Node: `variables` (Estado Cross-Run)

**Estado:** 🔜 Pendiente — referenciado desde Plan 27-A

## Contexto

Gestión explícita de variables de workflow entre nodos y entre múltiples runs. Hoy solo existe interpolación `$inputs/$steps`.

## Decisiones confirmadas

- Scope: **cross-run persistente** (por `workflowId + key`)
- Operaciones: `set`, `get`, `delete`
- Store: disco, patrón `WorkflowStore`

## Diseño preliminar

- `VariableOpSchema`: `{ op, key, value? }`
- `WorkflowVariableStore`: `getUserDir(username)/workflow-variables/{workflowId}.json`
- Variables accesibles en scope via `$steps.varStep.outputs.key`

## Dependencias

- Plan 27-A (`http` node) debe estar en producción primero
- Requiere `variableOps` campo en `WorkflowStepSchema`

## Referencia de análisis previo

Ver `plans/27-workflow-nodes-n8n-value-ranking.md` para el ranking estratégico.
