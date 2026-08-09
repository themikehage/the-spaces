# Unificación del Sistema de Entidades: Agent como SSOT

**Reglas de Arquitectura impulsadas**: AGENTS.md / Backend Rules (Ports First, Single Responsibility, EventBus).

---

## 1. Estado Actual (As-Is) — Mediciones Concretas

### 1.1 Avances Ya Completados en el Repositorio

| Componente | Estado | Detalle |
|---|---|---|
| `AgentTypeSchema` | ✅ Completado | `packages/shared/src/schemas.ts` L231 define 8 variantes de tipo. |
| `AgentCapabilitiesSchema` | ✅ Completado | `packages/shared/src/agent-capabilities.ts` soporta `workspace`, `group`, `workflow`, `delegation`. |
| `AgentTypeRegistry` | ✅ Completado | `apps/server/src/core/entities/agent-type-registry.ts` implementa `IAgentTypeStrategy` con 7 estrategias concretas. |
| HTTP Routes (`config`, `skills`) | ✅ Completado | Eliminada `resolveTargetWorkspace`. Rutas consumen `agentTypeRegistry.get(type).getWorkspaceDir()`. |
| Eliminación `ScopeConfigManager` | ✅ Completado | `ScopeConfigManager` y `core/scope/` eliminados. `CascadeConfigLoader` absorbió la resolución por `AgentRef`. |
| Migración de Persistencia | ✅ Completado | `core/migration/entity-migration.ts` implementado para migrar `teams/*.json` y `projects/*.json` a `AgentDefinition`. |

### 1.2 Brechas y Deuda Pendiente de Implementación

| # | Archivo / Componente | Ocurrencias / Líneas | Problema Concreto |
|---|---|---|---|
| 1 | `core/session/prompt-builder.ts` | L308-L320 | `previewSystemPrompt` recibe `(entityType, agentId, projectId, teamId, subagentId)` con 5 ramas `if (entityType === ...)` sin delegar a `AgentTypeRegistry`. |
| 2 | `core/session/prompt-builder.ts` | L348, L462 | Importaciones dinámicas en runtime (`import("../../agents")`, `import("../../teams/team-store")`) para evitar dependencias circulares por falta de DI. |
| 3 | `core/workflows/workflow-store.ts` & `workflow-session-bootstrap.ts` | L39 & L33 | Invocación directa a `agentRegistry.syncWorkflowAgent()` al guardar workflows en lugar de desacoplarse vía `IEventBus`. |
| 4 | `agents/agent-registry.ts` & `agent-registry.port.ts` | L188 & L28 | Método `syncWorkflowAgent()` expuesto en el contrato y en la implementación de agentes por acoplamiento con Workflows. |
| 5 | `packages/shared/src/schemas.ts` | L861, L892, L931 | `PromptPreviewEntityTypeSchema`, `EntityTypeSchema` y `ToolScopeTargetSchema` no están derivados vía `.extract()` de `AgentTypeSchema`. |
| 6 | `packages/shared/src/schemas.ts` | L243 | `AgentScopeTargetSchema` sigue existiendo en el archivo sin haber sido removido. |
| 7 | `apps/client/src/hooks/` | Varias | Hooks `useEntityConfig`, `useEntitySkills`, `useEntityCustomTools` usan la tupla `(entityType, entityId)` en lugar de `AgentRef`. |

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

Criterios **binarios y verificables automáticamente**. La implementación está completa cuando todos son `true`.

### 2.A Desacoplamiento de Workflows vía EventBus (`apps/server`)

- [x] **A1** — `AgentRegistry.syncWorkflowAgent()` es **eliminado** tanto de `agent-registry.ts` como de `agent-registry.port.ts`.
- [x] **A2** — `workflow-store.ts` y `workflow-session-bootstrap.ts` no importan `agentRegistry`. Emiten el evento `workflow:saved` vía `IEventBus`.
- [x] **A3** — `AgentRegistry` escucha el evento `workflow:saved` y registra/actualiza de forma reactiva la entidad del agente workflow.

### 2.B `SessionPromptBuilder` Polimórfico (`apps/server`)

- [x] **B1** — `SessionPromptBuilder.previewSystemPrompt()` recibe `(agentRef: AgentRef, username: string)` en lugar de la tupla fragmentada de 5 IDs.
- [x] **B2** — Cero bloques `if (entityType === ...)` en `prompt-builder.ts`. Cada sección del prompt se genera mediante `AgentTypeRegistry.get(agentRef.type).buildPromptSection(agent, username)`.
- [x] **B3** — Cero importaciones dinámicas (`import("../../agents")` / `import("../../teams")`) en `prompt-builder.ts`. Las dependencias son inyectadas en el constructor.

### 2.C Cleanup de Schemas Compartidos (`packages/shared`)

- [x] **C1** — `PromptPreviewEntityTypeSchema`, `EntityTypeSchema` y `ToolScopeTargetSchema` derivan explícitamente de `AgentTypeSchema` vía `.extract()` o utilidades Zod.
- [x] **C2** — `AgentScopeTargetSchema` es derivado desde `AgentTypeSchema`.
- [x] **C3** — `pnpm --filter shared run typecheck` finaliza con exit code 0.

### 2.D Adaptación del Frontend (`apps/client`)

- [x] **D1** — Hooks `useEntityConfig`, `useEntitySkills` y `useEntityCustomTools` aceptan `agentRef: AgentRef`.
- [x] **D2** — `pnpm --filter client run typecheck` finaliza con exit code 0.

### 2.E Verificación Integral de Sistema

- [x] **E1** — `pnpm --filter shared run typecheck` → exit code 0.
- [x] **E2** — `pnpm --filter server run typecheck` → exit code 0.
- [x] **E3** — `pnpm --filter server test` → exit code 0, sin tests rotos ni omitidos.
- [x] **E4** — `pnpm --filter client run typecheck` → exit code 0.
- [x] **E5** — `pnpm build` → exit code 0 en todos los workspaces del monorepo.

---

## 3. Hitos Innegociables

Los hitos se ejecutan en orden estricto. **Cada hito termina con su verificación automatizable antes de comenzar el siguiente.**

---

### Hito 1: Desacoplar Workflows de `AgentRegistry` mediante `IEventBus`

**Responsabilidad**: Eliminar el acoplamiento directo entre el almacenamiento de workflows y el registro de agentes.

**Artefactos**:

1. **MODIFICAR** `apps/server/src/core/infra/event-bus.ts` y/o puertos de eventos
   - Definir payload para evento `workflow:saved`: `{ username: string; workflowDef: any }`.

2. **MODIFICAR** `apps/server/src/core/workflows/workflow-store.ts` y `apps/server/src/core/workflows/workflow-session-bootstrap.ts`
   - Reemplazar `agentRegistry.syncWorkflowAgent(username, def)` por `eventBus.emit("workflow:saved", { username, workflowDef: def })`.

3. **MODIFICAR** `apps/server/src/agents/agent-registry.ts` y `apps/server/src/core/ports/agent-registry.port.ts`
   - Suscribir `agentRegistry` al evento `workflow:saved` durante la inicialización.
   - Eliminar el método `syncWorkflowAgent()` de la clase y del puerto.

**Verificación del Hito 1**:
```bash
grep -rn "syncWorkflowAgent" apps/server/src/
# Debe producir CERO líneas.
pnpm --filter server run typecheck
pnpm --filter server test
```

---

### Hito 2: Refactorizar `SessionPromptBuilder` a Polimorfismo por Estrategias

**Responsabilidad**: Convertir la vista previa de prompts en una operación polimórfica guiada por `AgentTypeRegistry`.

**Artefactos**:

1. **MODIFICAR** `apps/server/src/core/ports/agent-type-registry.port.ts`
   - Garantizar el método `buildPromptSection(agent: AgentDefinition, username: string): Promise<PromptSectionResult | null>` en `IAgentTypeStrategy`.

2. **MODIFICAR** `apps/server/src/core/entities/agent-type-registry.ts`
   - Implementar `buildPromptSection` en las estrategias concretas (`ProjectStrategy`, `TeamStrategy`, `WorkflowStrategy`, etc.).

3. **MODIFICAR** `apps/server/src/core/session/prompt-builder.ts`
   - Cambiar firma de `previewSystemPrompt` a `(agentRef: AgentRef, username: string)`.
   - Reemplazar los condicionales `if (entityType === ...)` por llamadas a `agentTypeRegistry.get(agentRef.type).buildPromptSection()`.
   - Eliminar `import("../../agents")` e `import("../../teams/team-store")` dinámicos. Inyectar dependencias en el constructor.

4. **MODIFICAR** `apps/server/src/routes/prompts.ts` o controladores de vista previa de prompt para pasar `AgentRef`.

**Verificación del Hito 2**:
```bash
grep -rn "import.*agents" apps/server/src/core/session/prompt-builder.ts
grep -rn "import.*teams" apps/server/src/core/session/prompt-builder.ts
grep -rn "if (entityType ===" apps/server/src/core/session/prompt-builder.ts
# Todos deben producir CERO líneas.
pnpm --filter server run typecheck
pnpm --filter server test
```

---

### Hito 3: Consolidación y Cleanup de Schemas en `packages/shared`

**Responsabilidad**: Eliminar enums fragmentados y derivar todos los tipos de entidad a partir de `AgentTypeSchema`.

**Artefactos**:

1. **MODIFICAR** `packages/shared/src/schemas.ts`
   - Derivar `EntityTypeSchema = AgentTypeSchema.extract(["global", "agent", "project", "team"])`.
   - Derivar `PromptPreviewEntityTypeSchema = AgentTypeSchema`.
   - Derivar `ToolScopeTargetSchema` según corresponda con `AgentTypeSchema`.
   - Eliminar la definición obsoleta de `AgentScopeTargetSchema`.

**Verificación del Hito 3**:
```bash
grep -rn "AgentScopeTargetSchema" packages/shared/src/
# Debe producir CERO líneas.
pnpm --filter shared run typecheck
pnpm --filter server run typecheck
```

---

### Hito 4: Migración del Frontend y Verificación de Build Monorepo

**Responsabilidad**: Actualizar el cliente para operar con `AgentRef` y validar la compilación integral del proyecto.

**Artefactos**:

1. **MODIFICAR** `apps/client/src/hooks/useEntityConfig.ts`, `useEntitySkills.ts`, `useEntityCustomTools.ts`
   - Actualizar firmas para recibir `agentRef: AgentRef`.

2. **MODIFICAR** Componentes del frontend (`EntityConfigEditor`, `EntitySkillsEditor`, etc.)
   - Propagar el uso de `AgentRef`.

**Verificación del Hito 4 (= Completion del Plan)**:
```bash
pnpm --filter shared run typecheck
pnpm --filter server run typecheck
pnpm --filter client run typecheck
pnpm --filter server test
pnpm build
# TODOS deben finalizar con exit code 0.
```

---

## 4. Restricciones No Negociables de Ejecución

1. **Orden estricto de hitos**: Hito 1 → Hito 2 → Hito 3 → Hito 4. Sin solapar trabajo.
2. **Sin cambios de comportamiento observable**: La API REST y las respuestas WebSocket mantienen su formato y contratos.
3. **Un commit por hito**: `refactor(entities): hito-1-workflows-eventbus`, `refactor(entities): hito-2-prompt-builder-polymorphic`, etc.
4. **Typecheck y tests en verde al finalizar cada hito**.
5. **No borrar tests**: Si un test dependía de `syncWorkflowAgent()`, adaptar el test para usar la emisión de eventos.
