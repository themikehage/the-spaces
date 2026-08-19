# Hito 6 — Projects & Agents

**Prerequisito**: Hito 5 completado y verificado (todos los criterios H5-A* en verde).

**Objetivo**: Gestión de proyectos y agentes desde mobile. CRUD completo con configuración de herramientas y skills por entidad. Equivalente de `ProjectsPage` + `AgentsPage` + `AgentsPageState` + `useEntityConfig` del cliente web.

**Principios innegociables**:
- `ProjectsRepository` y `AgentsRepository` son las únicas clases que hacen HTTP para sus respectivos dominios.
- La configuración de entidad (tools, skills, modelo) se edita desde el mismo detail screen — no pantalla separada.
- Los cambios de config disparan `entity-updated` equivalente en mobile: el stream WS notifica al resto de la app.

---

## 1. Estado Actual (As-Is)

- Existen placeholders de `ProjectsScreen` y `AgentsScreen` en el shell del Hito 3.
- El backend expone CRUD completo para projects y agents con endpoint `/api/config` por entidad.

---

## 2. Estado Final (To-Be) — Criterios de Aceptación

- [ ] **H6-A1** — `ProjectsScreen` lista proyectos reales con search funcional.
- [ ] **H6-A2** — Tap en proyecto → `ProjectDetailScreen` con sesiones del proyecto y config básica.
- [ ] **H6-A3** — Crear proyecto (FAB) → aparece en la web sin refresh.
- [ ] **H6-A4** — `AgentsScreen` lista agentes con search funcional.
- [ ] **H6-A5** — Tap en agente → `AgentDetailScreen` con: modelo asignado, tools activas, skills asignadas.
- [ ] **H6-A6** — Cambiar el modelo de un agente desde mobile → la próxima sesión usa el modelo nuevo.
- [ ] **H6-A7** — `EntityConfigEditor` widget reutilizable: usado en `ProjectDetailScreen` y `AgentDetailScreen`.
- [ ] **H6-A8** — `flutter analyze lib/features/projects/ lib/features/agents/` produce cero warnings.
- [ ] **H6-A9** — `flutter test test/features/projects/ test/features/agents/` produce exit code 0.

---

## 3. Hitos Innegociables

---

### Sub-hito 6.1: ProjectsRepository + Notifier

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/projects/data/models/project.dart`
   - `Project` con `freezed`: `id`, `name`, `description`, `agentIds`, `sessionCount`, `updatedAt`.

2. **[NEW]** `apps/mobile/lib/features/projects/data/projects_repository.dart`
   - `getProjects()` → `GET /api/projects`.
   - `createProject(name, description)` → `POST /api/projects`.
   - `updateProject(id, patch)` → `PUT /api/projects/:id`.
   - `deleteProject(id)` → `DELETE /api/projects/:id`.

3. **[NEW]** `apps/mobile/lib/features/projects/ui/projects_notifier.dart`
   - `ProjectsState { projects, isLoading, searchQuery, error }`.
   - Métodos: `load()`, `search(query)`, `createProject(...)`, `deleteProject(id)`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/projects/projects_repository_test.dart
# CRUD completo sin errores.
```

---

### Sub-hito 6.2: AgentsRepository + Notifier

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/agents/data/models/agent.dart`
   - `Agent` con `freezed`: `id`, `name`, `description`, `model`, `tools`, `skills`, `avatarUrl`.

2. **[NEW]** `apps/mobile/lib/features/agents/data/agents_repository.dart`
   - `getAgents()` → `GET /api/agents`.
   - `createAgent(...)` → `POST /api/agents`.
   - `updateAgent(id, patch)` → `PUT /api/agents/:id`.
   - `deleteAgent(id)` → `DELETE /api/agents/:id`.
   - `getResolvedConfig(agentId)` → `GET /api/config/resolved?entityType=agent&entityId=:id`.

3. **[NEW]** `apps/mobile/lib/features/agents/ui/agents_notifier.dart`
   - `AgentsState { agents, isLoading, searchQuery, error }`.

**Verificación**:
```bash
cd apps/mobile && flutter test test/features/agents/agents_repository_test.dart
# CRUD completo. getResolvedConfig → config tipada.
```

---

### Sub-hito 6.3: EntityConfigEditor widget

**Responsabilidad**: Widget reutilizable para editar config de cualquier entidad (project, agent, team).

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/shared/widgets/entity_config_editor.dart`
   - Sección "Model" — dropdown de modelos disponibles.
   - Sección "Tools" — lista de tools con toggles.
   - Sección "Skills" — lista de skills con toggles.
   - Recibe `entityType`, `entityId` y `onSave` callback.
   - Llama `PUT /api/config` al guardar.

**Verificación**:
```bash
cd apps/mobile && flutter test test/shared/widgets/entity_config_editor_test.dart
# Cambiar modelo → onSave llamado con patch correcto.
```

---

### Sub-hito 6.4: Screens de Projects y Agents

**Artefactos**:

1. **[NEW]** `apps/mobile/lib/features/projects/ui/projects_screen.dart`
   - Lista + search + FAB para crear.

2. **[NEW]** `apps/mobile/lib/features/projects/ui/project_detail_screen.dart`
   - Sesiones del proyecto (lista simple, tap → chat).
   - `EntityConfigEditor` para la config del proyecto.

3. **[NEW]** `apps/mobile/lib/features/agents/ui/agents_screen.dart`
   - Lista + search + FAB para crear.

4. **[NEW]** `apps/mobile/lib/features/agents/ui/agent_detail_screen.dart`
   - Avatar, nombre, descripción.
   - `EntityConfigEditor` para model/tools/skills.

**Verificación visual**: CRUD de proyectos y agentes funcional en simulador.

---

## 4. Verificación Final del Hito 6

```bash
# 1. Análisis estático
cd apps/mobile && flutter analyze lib/features/projects/ lib/features/agents/ lib/shared/widgets/entity_config_editor.dart
# → "No issues found!"

# 2. Tests
cd apps/mobile && flutter test test/features/projects/ test/features/agents/
# → exit code 0

# 3. EntityConfigEditor reutilizado en ambos details
grep -rn "EntityConfigEditor" apps/mobile/lib/features/ --include="*.dart"
# → al menos 2 archivos distintos

# 4. Sin Dio directo
grep -rn "import 'package:dio" apps/mobile/lib/features/projects/ apps/mobile/lib/features/agents/ --include="*.dart"
# → cero líneas
```

---

## 5. Restricciones No Negociables

1. **Orden estricto**: 6.1 → 6.2 → 6.3 → 6.4.
2. **`EntityConfigEditor` es el único widget que edita config de entidad** — no duplicar lógica en cada detail screen.
3. **Un commit por sub-hito**: `feat(mobile): hito-6.1-projects-repository`, etc.
4. **`flutter analyze` verde** antes de pasar al siguiente sub-hito.
