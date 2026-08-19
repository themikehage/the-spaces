# Hito 9 — Teams & Workflows

**Prerequisito**: Hito 8 completado y verificado (todos los criterios H8-A* en verde).

**Objetivo**: Gestión de equipos y visualización/ejecución de workflows desde mobile. Equivalente de `TeamsPage` + `TeamDetailPage` + `WorkflowsListPage` + `WorkflowDetailPage` del cliente web. El workflow builder visual (editor de nodos) **no** se implementa en mobile — solo se puede consultar, ejecutar y aprobar.

**Principios innegociables**:
- `TeamsRepository` y `WorkflowsRepository` son las únicas clases que hacen HTTP para sus dominios.
- El workflow builder visual es read-only en mobile: se puede ver el grafo pero no editar.
- Aprobaciones de workflows se manejan via el `AttentionHub` del Hito 7 — no duplicar UI de aprobación.

---

## 1. Estado Actual (As-Is)

- Existen placeholders de Teams y Workflows accesibles desde el `AppDrawer` del Hito 3.
- El `AttentionHub` del Hito 7 ya maneja aprobaciones de workflows.
- El backend expone CRUD de teams y CRUD + ejecución de workflows.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [ ] **H9-A1** — `TeamsScreen` lista equipos con search funcional.
- [ ] **H9-A2** — `TeamDetailScreen` muestra: agentes del equipo, sesiones del equipo, config de entidad.
- [ ] **H9-A3** — Crear equipo → aparece en la web sin refresh.
- [ ] **H9-A4** — `WorkflowsScreen` lista workflows con su estado de última ejecución.
- [ ] **H9-A5** — Tap en workflow → `WorkflowDetailScreen` con: info, últimas ejecuciones, botón "Run".
- [ ] **H9-A6** — Botón "Run" en `WorkflowDetailScreen` → ejecuta el workflow → aparece en estado `running` en la web.
- [ ] **H9-A7** — `WorkflowRunDetailScreen` muestra los pasos del run con su estado (pending/running/done/error).
- [ ] **H9-A8** — Workflow con nodo `approval` pendiente → item visible en `AttentionHub` (ya cubierto por Hito 7, verificar integración).
- [ ] **H9-A9** — `flutter analyze lib/features/teams/ lib/features/workflows/` produce cero warnings.
- [ ] **H9-A10** — `flutter test test/features/teams/ test/features/workflows/` produce exit code 0.

---

## 3. Hitos Innegociables

---

### Sub-hito 9.1: TeamsRepository + Notifier + Screens

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/teams/data/models/team.dart`
   - `Team` con `freezed`: `id`, `name`, `description`, `agentIds`, `sessionCount`, `updatedAt`.

2. **[NEW]** `apps/mobile/lib/features/teams/data/teams_repository.dart`
   - `getTeams()` → `GET /api/teams`.
   - `createTeam(...)` → `POST /api/teams`.
   - `updateTeam(id, patch)` → `PUT /api/teams/:id`.
   - `deleteTeam(id)` → `DELETE /api/teams/:id`.

3. **[NEW]** `apps/mobile/lib/features/teams/ui/teams_notifier.dart`
   - `TeamsState { teams, isLoading, searchQuery, error }`.

4. **[NEW]** `apps/mobile/lib/features/teams/ui/teams_screen.dart`
   - Lista + search + FAB para crear.

5. **[NEW]** `apps/mobile/lib/features/teams/ui/team_detail_screen.dart`
   - Agentes del equipo, sesiones, `EntityConfigEditor`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/teams/
# CRUD de teams. flutter analyze lib/features/teams/ → cero warnings.
```

---

### Sub-hito 9.2: WorkflowsRepository + Notifier

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/workflows/data/models/workflow.dart`
   - `Workflow` con `freezed`: `id`, `name`, `description`, `nodes`, `lastRunStatus`, `updatedAt`.

2. **[NEW]** `apps/mobile/lib/features/workflows/data/models/workflow_run.dart`
   - `WorkflowRun` con `freezed`: `id`, `workflowId`, `status`, `steps`, `startedAt`, `finishedAt?`.
   - `WorkflowStep`: `id`, `name`, `status`, `output?`, `error?`.

3. **[NEW]** `apps/mobile/lib/features/workflows/data/workflows_repository.dart`
   - `getWorkflows()` → `GET /api/workflows`.
   - `getWorkflow(id)` → `GET /api/workflows/:id`.
   - `runWorkflow(id)` → `POST /api/workflows/:id/run` → `WorkflowRun`.
   - `getWorkflowRuns(workflowId)` → `GET /api/workflows/:id/runs`.
   - `getWorkflowRun(workflowId, runId)` → `GET /api/workflows/:id/runs/:runId`.
   - `abortRun(workflowId, runId)` → `DELETE /api/workflows/:id/runs/:runId`.

4. **[NEW]** `apps/mobile/lib/features/workflows/ui/workflows_notifier.dart`
   - `WorkflowsState { workflows, isLoading, error }`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/workflows/workflows_repository_test.dart
# getWorkflows → lista. runWorkflow → WorkflowRun. abortRun → sin error.
```

---

### Sub-hito 9.3: Workflow Screens

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/workflows/ui/workflows_screen.dart`
   - Lista de workflows con estado de última ejecución (badge de color).

2. **[NEW]** `apps/mobile/lib/features/workflows/ui/workflow_detail_screen.dart`
   - Info del workflow (nombre, descripción, node count).
   - Lista de últimas ejecuciones con su estado.
   - FAB "Run" → `workflowsNotifier.runWorkflow(id)` → navega a `WorkflowRunDetailScreen`.
   - **Sin editor visual de nodos** — texto "Edit in web client" si el usuario intenta editar.

3. **[NEW]** `apps/mobile/lib/features/workflows/ui/workflow_run_detail_screen.dart`
   - Pasos del run en orden con iconos de estado.
   - Estado en tiempo real via eventos WS `workflow_step_*`.
   - Botón "Abort" si el run está en `running`.

**Verificación visual**: Ejecutar workflow desde mobile → visible como running en web. Nodos aparecen en `WorkflowRunDetailScreen` con estado en tiempo real.

---

## 4. Verificación Final del Hito 9

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/teams/ lib/features/workflows/
# → "No issues found!"

# 2. Tests
cd apps/mobile && flutter test test/features/teams/ test/features/workflows/
# → exit code 0

# 3. Sin editor de nodos en mobile
grep -rn "NodeEditor\|WorkflowBuilder\|workflow_builder" apps/mobile/lib/ --include="*.dart"
# → cero líneas

# 4. Aprobaciones de workflow via AttentionHub (no duplicadas)
grep -rn "approval_required\|ApprovalCard" apps/mobile/lib/features/workflows/ --include="*.dart"
# → cero líneas (se maneja en features/attention/)
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 9.1 → 9.2 → 9.3.
2. **El workflow builder visual es read-only** en mobile — ningún editor de nodos.
3. **Las aprobaciones van al AttentionHub** — no se duplica UI de aprobación en features/workflows/.
4. **Un commit por sub-hito**: `feat(mobile): hito-9.1-teams`, `feat(mobile): hito-9.2-workflows-repository`, etc.
5. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
