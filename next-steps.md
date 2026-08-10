# Next Steps Enriquecidos — Plan de Implementación

---

## 1. Abstraer al 100% la interfaz de custom tools y permitir asignación específica por agente, proyecto o team

### Estado actual

Las custom tools ya tienen una arquitectura de dos capas (`BaseTool` en shared + `CustomToolDefinition` en server), pero la abstracción no es completa:

- `SessionToolFactory.createSessionTools()` mezcla herramientas built-in, de extensión, de memoria y custom tools en un solo array de `BaseTool[]`, filtrando custom tools por scope cascade en el mismo método.
- `CustomToolStorage` persiste en disco por usuario (`<userDir>/custom-tools/`), no por entidad.
- `ScopeConfigManager.resolveToolsForAgent()` implementa la cascada `global -> team -> project -> agent` correctamente, pero solo para nombres de tools, no para definiciones completas.
- `EntityCustomToolsEditor` en el cliente maneja toggles por entidad, pero el editor de tool individual (crear/editar definición) no distingue scope.

### Archivos relevantes

| Archivo                                                           | Rol                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------- |
| `packages/shared/src/tools/base-tool.ts`                          | Interfaz canónica `BaseTool`, `ToolDeclaration`, `ToolResult` |
| `packages/shared/src/tools/function-tool.ts`                      | `FunctionTool` — implementación concreta                      |
| `packages/shared/src/tools/tool-registry.ts`                      | `ToolRegistry` compartido con namespaces                      |
| `packages/shared/src/tools/legacy-adapter.ts`                     | `legacyToolToBaseTool()`                                      |
| `apps/server/src/core/custom-tools/schemas.ts`                    | `CustomToolDefinitionSchema` con campo `scope` opcional       |
| `apps/server/src/core/custom-tools/storage.ts`                    | `CustomToolStorage` — persistencia flat-file                  |
| `apps/server/src/core/custom-tools/runtime.ts`                    | `createCustomToolRuntime()`                                   |
| `apps/server/src/core/custom-tools/manage-custom-tools-tool.ts`   | Tool `manage_custom_tools` para CRUD runtime                  |
| `apps/server/src/core/session/tool-factory.ts`                    | `SessionToolFactory.createSessionTools()`                     |
| `apps/server/src/core/scope/scope-config-manager.ts`              | Cascada `resolveToolsForAgent()`                              |
| `apps/client/src/components/settings/EntityCustomToolsEditor.tsx` | UI de toggles por entidad                                     |
| `apps/client/src/hooks/useEntityCustomTools.ts`                   | Hook de gestión de scope                                      |
| `apps/client/src/lib/api/custom-tools.service.ts`                 | Cliente API                                                   |

### Plan de implementación

#### Fase 1: CustomToolStorage con scope por entidad

- Extender `CustomToolStorage` para que el directorio de persistencia acepte un `entityType` + `entityId` opcional:
  - `global`: `<userDir>/custom-tools/` (actual)
  - `team/<id>`: `<userDir>/teams/<teamId>/custom-tools/`
  - `project/<id>`: `<userDir>/projects/<projectId>/custom-tools/`
  - `agent/<id>`: `<userDir>/agents/<agentId>/custom-tools/`
- El método `loadAll(username, scope?)` debe resolver la cascada: si se consulta para un agente, devuelve `global + team(del agente) + project(del agente) + agent`.
- Agregar `getEffectiveTools(username, entityRef)` que haga la resolución completa.

#### Fase 2: Desacoplar creación de custom tools del factory

- Extraer `resolveCustomToolsForSession()` como método independiente en un nuevo archivo `apps/server/src/core/custom-tools/resolver.ts`.
- Esta función recibe `username`, `entityRef` (agentId, projectId, teamId) y `CustomToolStorage`, y devuelve `BaseTool[]` resueltos.
- `SessionToolFactory` delega en este resolver en lugar de hacer el filtrado inline.
- El resolver debe manejar la cascada de scope completa y retornar tools ya normalizadas (con `createCustomToolRuntime()`).

#### Fase 3: Interfaz unificada `ICustomToolProvider`

- Definir en `packages/shared/src/tools/` o en ports:
  ```ts
  interface ICustomToolProvider {
    getDefinitions(scope: ToolScope): Promise<CustomToolDefinition[]>;
    getRuntimeTools(scope: ToolScope): Promise<BaseTool[]>;
  }
  ```
- `CustomToolStorage` implementa `ICustomToolProvider`.
- Inyectar vía `ServerContext` para que sea reemplazable.

#### Fase 4: UI — Editor de custom tools con scope explícito

- El diálogo/modal de creación/edición de custom tool debe incluir un selector de scope (`global`, `team:X`, `project:Y`, `agent:Z`).
- `EntityCustomToolsEditor` ya maneja toggles; agregar botón "Create Custom Tool" que abra el editor con el scope pre-seleccionado.
- La vista de lista de custom tools debe mostrar el scope badge en cada tool.

#### Fase 5: Migración

- Migrar tools existentes (sin scope) a `scope: { type: "global" }`.
- Actualizar `CustomToolDefinitionSchema` para que `scope` sea requerido (con default `global` durante migración).

---

## 2. Agentes que existan únicamente dentro de un team (no globales)

### Estado actual

EL `AgentScopeTargetSchema` solo soporta dos variantes:

```ts
z.discriminatedUnion("type", [
  z.object({ type: z.literal("global") }),
  z.object({ type: z.literal("project"), id: z.string() }),
]);
```

**No existe `{ type: "team" }`.** La visibilidad de agentes se controla mediante `ScopeConfigManager`:

- `global.agents[]` — agentes visibles globalmente
- `projects[id].agents[]` — agentes visibles solo en un proyecto
- `teams[id].agents[]` — existe para resolución de tools, pero NO para visibilidad

`AgentRegistry.list()` solo devuelve agentes en `global.agents[]`. `listScoped()` solo consulta `projects[id].agents[]`.

### Archivos relevantes

| Archivo                                              | Rol                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `packages/shared/src/schemas.ts` (L223-257)          | `AgentScopeTargetSchema`, `AgentDefinitionSchema`                              |
| `apps/server/src/agents/agent-registry.ts`           | `AgentRegistry` con `list()`, `listScoped()`, `register()`                     |
| `apps/server/src/core/scope/scope-config-manager.ts` | `ScopeConfigManager` con `registerAgent()`, `getAgentTeamMembership()`         |
| `apps/server/src/routes/agents.ts`                   | Endpoints `GET /api/agents`, `POST /api/agents`, `PATCH /api/agents/:id/scope` |
| `apps/client/src/lib/api/agents.service.ts`          | Cliente API                                                                    |

### Plan de implementación

#### Fase 1: Extender el schema

- Agregar `{ type: z.literal("team"), id: z.string() }` a `AgentScopeTargetSchema`.
- Actualizar `AgentMembership` type en `scope-config-manager.ts` para incluir `{ type: "team"; id: string }`.

#### Fase 2: ScopeConfigManager

- `registerAgent()` debe manejar `scope.type === "team"`: guardar en `teams[scope.id].agents[]`.
- `getAgentMembership()` debe retornar `{ type: "team", id }` cuando el agente esté en `teams[id].agents[]`.
- Agregar `listTeamAgents(username, teamId)` para consultar agentes de un team.

#### Fase 3: AgentRegistry

- `listScoped(username, "teams", teamId)` — nuevo caso que consulta `scopeConfig.teams[teamId].agents[]`.
- Asegurar que `register()` persista correctamente el scope `team`.

#### Fase 4: API endpoints

- `GET /api/agents?scope=team&scopeId=<teamId>` — filtrar agentes por team.
- `PATCH /api/agents/:id/scope` — ya existe, solo necesita aceptar `{ type: "team", id }`.
- `GET /api/teams/:id/agents` — endpoint para listar agentes scoped al team (llama a `listTeamAgents`).

#### Fase 5: UI

- En `AgentRegisterModal` y `AgentSettingsModal`, el selector de scope debe incluir "Team" como opción, con un dropdown secundario para elegir el team.
- En `TeamDetailPage` o `TeamMembersModal`, mostrar solo agentes que pertenecen al team (o globales + team-scoped).

#### Fase 6: Limpieza

- Al eliminar un team, los agentes con scope `team:<id>` deben ser reasignados a `global` o eliminados (política a definir).

---

## 3. Modelo por omisión para cada proveedor y proveedor por omisión (COMPLETADO)

### Estado actual

**No existe** el concepto de "modelo por defecto por proveedor" ni "proveedor por defecto".

La resolución actual:

- `DefaultModelResolver.resolve()` toma el primer modelo disponible del `ModelRegistry` como fallback.
- `userConfigManager.getUserDefaultModel()` retorna `"${available[0].provider}/${available[0].id}"`.
- `EntityConfig.defaultModel` es un string global como `"openai/gpt-4o"`, no per-provider.
- `ProviderConfig` no tiene campo `defaultModel`.

Cuando se crea un agente/equipo/proyecto nuevo y no se especifica modelo explícitamente, se usa el fallback del primer modelo disponible (que depende del orden de registro: OpenAI > Google > xAI > DeepSeek > Groq > Mistral > OpenRouter > Qwen > OpenCodeGo).

### Archivos relevantes

| Archivo                                                       | Rol                                                 |
| ------------------------------------------------------------- | --------------------------------------------------- |
| `apps/server/src/core/model/model-registry.ts`                | `ModelRegistry`, `ProviderConfig`, `AvailableModel` |
| `apps/server/src/core/session/model-resolver.ts`              | `DefaultModelResolver`                              |
| `apps/server/src/core/session/user-config.ts`                 | `getUserDefaultModel()`                             |
| `apps/server/src/core/config/entity-config.ts`                | `EntityConfig.defaultModel`                         |
| `apps/server/src/core/config/cascade-config-loader.ts`        | `CascadeConfigLoader`                               |
| `apps/server/src/routes/settings.ts`                          | `GET/PATCH /api/settings`                           |
| `apps/client/src/components/settings/GeneralModelSection.tsx` | UI de selección de modelos                          |
| `apps/client/src/components/chat/ModelSelector.tsx`           | Selector de modelo en chat                          |

### Plan de implementación

#### Fase 1: Extender `ProviderConfig` con `defaultModel`

```ts
interface ProviderConfig {
  // ... existing fields ...
  defaultModel?: string; // model ID within this provider, e.g. "gpt-4o-mini"
}
```

- Al registrar cada provider, definir un `defaultModel` sensato:
  - OpenAI: `"gpt-4o-mini"`
  - Google: `"gemini-2.0-flash"`
  - DeepSeek: `"deepseek-chat"`
  - Groq: `"llama-3.3-70b-versatile"`
  - etc.

#### Fase 2: Agregar "default provider" en user settings

- Nuevo campo en `UserSettings`: `defaultProvider?: string` (e.g. `"openai"`).
- Endpoint `PATCH /api/settings` acepta `{ defaultProvider }`.
- Si `defaultProvider` está configurado, `DefaultModelResolver` prioriza modelos de ese proveedor.
- Si no, usa el orden de registro actual como fallback.

#### Fase 3: Ajustar `ModelResolver` para usar default por provider

Cuando no se especifica modelo para una entidad nueva:

1. Si hay `defaultProvider` en user settings → usar `providerConfig.defaultModel` de ese proveedor.
2. Si no hay `defaultProvider` → usar el primer proveedor configurado con API key + su `defaultModel`.
3. Si no hay ningún provider con key → error controlado.

#### Fase 4: UI en Settings

- En `SettingsPage` > General tab: dropdown "Default Provider" que lista solo providers con API key configurada.
- Al seleccionar un provider, mostrar debajo el modelo por defecto que se usará (con posibilidad de cambiarlo en un dropdown secundario).
- Estos valores se persisten en `settings.json` vía `PATCH /api/settings`.

#### Fase 5: Usar defaults en creación de entidades

- Al crear un agente/equipo/proyecto sin especificar modelo, el `EntityConfig.defaultModel` se inicializa desde los defaults del usuario.
- En `AgentRegisterModal`, `TeamCreateModal`, `ProjectSettingsModal`: el campo de modelo debe pre-poblarse con el default resuelto, mostrando claramente "Inherited from default settings".

---

## 4. Reutilizar mensajes enviados con flechas arriba/abajo (como en Cursor)

### Estado actual

**No existe** ningún historial de mensajes enviados. Las flechas arriba/abajo solo funcionan dentro del popover de autocomplete (`@mentions`, `/skills`). Cuando el popover está cerrado, las flechas mueven el cursor en el textarea.

Los mensajes existen solo en React state (`useChatAreaState.messages`) y se fetchean del servidor. No hay persistencia local de historial de envíos.

### Archivos relevantes

| Archivo                                                | Rol                                        |
| ------------------------------------------------------ | ------------------------------------------ |
| `apps/client/src/components/chat/ChatInput.tsx`        | Input principal con sesión activa          |
| `apps/client/src/components/chat/WelcomeChatInput.tsx` | Input sin sesión (creación)                |
| `apps/client/src/hooks/useChatInputForm.ts`            | Estado del formulario de chat (404 líneas) |
| `apps/client/src/hooks/useChatAreaState.ts`            | Estado de sesión, `handleSend()`           |
| `apps/client/src/lib/storage.ts`                       | Utilidad tipada de localStorage            |

### Plan de implementación

#### Fase 1: Historial de mensajes enviados en localStorage

- Nueva key en `storage.ts`: `chat-input-history` o `crewfy-sent-messages`.
- Array de strings (últimos N mensajes, sugerido N=50), persistido en localStorage.
- Cada vez que se envía un mensaje (en `handleSend` de `useChatAreaState`), se agrega al historial. Evitar duplicados consecutivos.
- Limitar a 50 entradas (FIFO).

#### Fase 2: Navegación con flechas en `useChatInputForm`

- Nuevo estado: `historyIndex: number` (-1 = no navegando, 0 = último mensaje, etc.).
- Nuevo estado: `savedDraft: string` (lo que el usuario estaba escribiendo antes de navegar).
- En `handleKeyDown`:
  - `ArrowUp` cuando no hay autocomplete abierto y el cursor está al inicio del input:
    - Si `historyIndex === -1`: guardar draft actual en `savedDraft`, set `historyIndex = 0`, cargar último mensaje.
    - Si `historyIndex < history.length - 1`: incrementar índice, cargar mensaje correspondiente.
  - `ArrowDown` cuando no hay autocomplete abierto y el cursor está al final del input:
    - Si `historyIndex > 0`: decrementar índice, cargar mensaje.
    - Si `historyIndex === 0`: restaurar `savedDraft`, set `historyIndex = -1`.
  - Cualquier otra tecla (typing): resetear `historyIndex = -1`.

#### Fase 3: Soportar también en `WelcomeChatInput`

- Misma lógica pero autónoma (no usa `useChatInputForm`).
- Estado local: `sentHistory`, `historyIndex`, `savedDraft`.
- `handleKeyDown` extendido con la misma lógica de flechas.

#### Fase 4: Almacenar historial por sesión (opcional, nice-to-have)

- Key: `chat-input-history-${sessionId}` para historial específico de sesión.
- Key: `chat-input-history-global` para historial cross-sesión.
- Priorizar historial de sesión, caer en global.

---

## 5. Galería de equipos que puedan resolver problemas concretos

### Estado actual

El schema (`GalleryItemSchema`, `BlueprintTypeSchema`) ya soporta `type: "team"`. La UI del cliente (`AgentsPage` > Gallery tab) ya renderiza team blueprints con vista de detalle (miembros, contexto). El modelo `TeamSchema` ya tiene campo `blueprintId`.

**Lo que falta es el backend:**

- `GET /api/gallery/blueprints` solo escanea `community/agents/`, no `community/teams/`.
- `POST /api/gallery/blueprints/:id/install` solo instala agentes, no equipos.
- No existe el directorio `community/teams/`.
- No hay blueprints de ejemplo.

### Archivos relevantes

| Archivo                                                      | Rol                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `packages/shared/src/schemas.ts` (L543-658)                  | `GalleryItemSchema`, `GalleryMetadataSchema`, `BlueprintTypeSchema` |
| `apps/server/src/routes/gallery.ts`                          | Endpoints de gallery (solo agents actualmente)                      |
| `apps/client/src/pages/AgentsPage.tsx`                       | Gallery tab con filtro "Teams"                                      |
| `apps/client/src/components/agents/BlueprintDetailModal.tsx` | Vista de detalle (soporta teams)                                    |
| `apps/client/src/hooks/useAgentsPageState.ts`                | Estado de gallery, `fetchBlueprints()`, `handleInstall()`           |
| `apps/client/src/lib/api/agents.service.ts`                  | `fetchBlueprints()`, `installBlueprint()`                           |
| `apps/server/src/teams/team-store.ts`                        | `TeamStore.createTeam()`                                            |

### Plan de implementación

#### Fase 1: Backend — escanear y servir team blueprints

- Extender `GET /api/gallery/blueprints` para escanear también `community/teams/`:
  ```
  community/teams/<team-id>/blueprint.json
  community/teams/<team-id>/icon.svg
  ```
- El `blueprint.json` debe tener estructura:
  ```json
  {
    "definition": {/* CreateTeamSchema */},
    "metadata": {/* GalleryMetadataSchema */}
  }
  ```
- Devolver items con `type: "team"` en el array de blueprints.

#### Fase 2: Backend — instalar team blueprints

- Extender `POST /api/gallery/blueprints/:id/install`:
  - Detectar `type === "team"` en el blueprint.
  - Llamar a `teamStore.createTeam()` con la definición + `blueprintId`.
  - Si el team referencia agentes que no existen, crearlos primero (o mostrar warning).
  - Provisionar skills asociadas.
- Retornar el team creado.

#### Fase 3: Crear blueprints de ejemplo

- Crear directorio `community/teams/` con al menos 3-4 blueprints iniciales:
  1. **Code Review Team**: lead + 2 revisores, modo debate, especializado en revisión de PRs.
  2. **Architecture Design Team**: lead arquitecto + miembros especialistas, para decisiones de diseño.
  3. **Debug Squad**: lead + miembros con diferentes especialidades (frontend, backend, infra).
  4. **Documentation Team**: lead editor + miembros writers, para generar documentación.
- Cada uno con `blueprint.json` + `icon.svg` + `README.md` opcional.

#### Fase 4: UI — Pestaña Gallery en TeamsPage

- Agregar una pestaña "Gallery" en `TeamsPage` (similar a como está en `AgentsPage`).
- O bien, crear una ruta dedicada `/teams/gallery`.
- Vista previa del team: mostrar miembros, roles, descripción, tags.
- Botón "Install" que llame a `installBlueprint()`.
- Después de instalar, navegar al team creado.

#### Fase 5: Template en TeamCreateModal

- En `TeamCreateModal`, agregar opción "Create from template" que abra un selector de blueprints.
- Pre-llenar el formulario con los datos del blueprint seleccionado (miembros, configuración).

---

## 6. Nueva variante de custom tool que pueda usar aprobación del usuario

### Estado actual

Las custom tools tienen dos modos de ejecución (`pipeline` y `ui`), pero **ninguno** interactúa con el sistema de aprobaciones. El `CustomToolDefinitionSchema` no tiene campo `requiresApproval`.

El sistema de aprobaciones tiene dos registros paralelos:

- `ApprovalManager`: para aprobaciones de seguridad (60s timeout), usado por `beforeToolCall` hook + `PermissionEngine`.
- `UiApprovalRegistry`: para interacciones UI (`ask_question`, `request_approval`), timeout de 300s.

El `PermissionEngine` puede retornar `"ask"` para requerir aprobación, pero esto solo aplica a tools built-in (bash, write, edit). Las custom tools no pasan por el `PermissionEngine` directamente — solo los pasos de pipeline individuales sí lo hacen.

### Archivos relevantes

| Archivo                                                          | Rol                                               |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| `apps/server/src/core/custom-tools/schemas.ts`                   | `CustomToolDefinitionSchema` (sin campo approval) |
| `apps/server/src/core/custom-tools/runtime.ts`                   | `createCustomToolRuntime()`                       |
| `apps/server/src/core/approvals/approval-manager.ts`             | `ApprovalManager` (seguridad, 60s)                |
| `apps/server/src/core/approvals/ui-approval-registry.ts`         | `UiApprovalRegistry` (UI, 300s)                   |
| `apps/server/src/core/sandbox/permission-engine.ts`              | `PermissionEngine` con `allow/deny/ask`           |
| `apps/server/src/core/session/before-tool-call-hook.ts`          | Hook central de aprobación                        |
| `apps/server/src/core/tools/extensions/ui.tool.ts`               | `request_approval`, `ask_question`                |
| `apps/server/src/ws/handlers/tools.ts`                           | WS handler para `ui_action`                       |
| `apps/client/src/components/approvals/GlobalApprovalOverlay.tsx` | Overlay de aprobaciones                           |
| `apps/client/src/components/approvals/AttentionHubPopover.tsx`   | Popover de campanita                              |

### Plan de implementación

#### Fase 1: Extender `CustomToolDefinitionSchema`

- Agregar campo `requiresApproval`:
  ```ts
  requiresApproval: z.boolean().optional().default(false);
  ```
- Agregar campo `approvalConfig` (opcional, para afinar comportamiento):
  ```ts
  approvalConfig: z.object({
    severity: z.enum(["info", "warning", "critical"]).optional().default("warning"),
    confirmLabel: z.string().optional(),
    cancelLabel: z.string().optional(),
    timeout: z.number().optional().default(60000),
  }).optional();
  ```

#### Fase 2: Integrar aprobación en `createCustomToolRuntime()`

- Si `def.requiresApproval === true`, wrappear el `execute` de la tool:
  1. Antes de ejecutar, llamar a `approvalManager.request()` con los detalles de la tool.
  2. Esperar la resolución (aprobado/denegado/timeout).
  3. Si denegado, retornar error controlado.
  4. Si aprobado, ejecutar normalmente.
- Para tools `pipeline`: la aprobación se pide UNA vez al inicio del pipeline completo, no por paso.
- Para tools `ui`: la aprobación se pide antes de renderizar el UI.

#### Fase 3: Inyectar `ApprovalManager` y `UiApprovalRegistry`

- Actualmente `createCustomToolRuntime` recibe opciones limitadas. Extender para aceptar:
  ```ts
  interface CustomToolRuntimeOptions {
    // ... existing ...
    approvalManager?: ApprovalManager;
    uiApprovalRegistry?: UiApprovalRegistry;
    sessionId?: string;
    username?: string;
  }
  ```
- `SessionToolFactory` debe pasar estas dependencias al crear las custom tools.

#### Fase 4: UI — Mostrar custom tools pendientes de aprobación

- `GlobalApprovalOverlay` y `AttentionHubPopover` ya muestran aprobaciones por `toolName`. Las custom tools aparecerán automáticamente con su nombre.
- Si la custom tool tiene `approvalConfig.severity`, el overlay debe reflejar el color (info=azul, warning=ámbar, critical=rojo).
- Agregar en el editor de custom tools un toggle "Requires user approval" con configuración de severidad.

#### Fase 5: Custom tools con `ask_question` embebido

- Nueva variante `approvalType: "inline_question"` que permite a la custom tool hacer preguntas al usuario durante la ejecución del pipeline (entre pasos).
- Usa `UiApprovalRegistry` internamente.
- Esto permite flujos interactivos: "El paso 1 generó X. ¿Querés continuar con el paso 2 o modificar parámetros?"

---

## 7. Unificar tools de task en una sola `task.tool` y eliminar `manage_pipelines`

### Estado actual

Tres tools separadas + una muerta:

| Tool                 | Archivo                    | Acción                             |
| -------------------- | -------------------------- | ---------------------------------- |
| `decompose_tasks`    | `decompose.tool.ts`        | Crear plan de tareas               |
| `update_task_status` | `update-task.tool.ts`      | Marcar tarea como done/failed      |
| `complete_task_list` | `update-task.tool.ts`      | Finalizar plan completo            |
| `manage_pipelines`   | `manage-pipelines.tool.ts` | **Muerta** — siempre retorna error |

El estado se persiste en `tasks.json` vía `TaskStateManager`. La UI es `FloatingTasks.tsx`.

### Archivos relevantes

| Archivo                                                          | Rol                                               |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| `apps/server/src/core/tools/extensions/decompose.tool.ts`        | Tool `decompose_tasks`                            |
| `apps/server/src/core/tools/extensions/update-task.tool.ts`      | Tools `update_task_status` + `complete_task_list` |
| `apps/server/src/core/tools/extensions/task-state-manager.ts`    | Persistencia y validación                         |
| `apps/server/src/core/tools/extensions/manage-pipelines.tool.ts` | Tool muerta                                       |
| `apps/server/src/core/tools/extensions/ui.tool.ts`               | Crea las tools de task                            |
| `apps/server/src/core/session/prompt-builder.ts`                 | Inyecta plan activo en system prompt              |
| `packages/shared/src/schemas.ts`                                 | `TaskSchema`, `TaskRunnerStateSchema`             |
| `packages/shared/src/tools-catalog.ts`                           | `AVAILABLE_TOOLS`, `TOOL_GROUPS.tasks`            |
| `apps/client/src/components/chat/FloatingTasks.tsx`              | UI de progreso                                    |

### Plan de implementación

#### Fase 1: Crear `task.tool.ts` unificado

- Nuevo archivo: `apps/server/src/core/tools/extensions/task.tool.ts`
- Una sola tool registrada como `"task"` con parámetro `action`:

```ts
// action: "start"
{ action: "start", objective: string, tasks: TaskInput[] }

// action: "update"
{ action: "update", taskId: string, status: "done" | "failed", log?: string }

// action: "end"
{ action: "end", summary: string }

// action: "status" (nuevo, para consultar estado sin modificar)
{ action: "status" }
```

- `execute` despacha a handlers internos: `handleStart`, `handleUpdate`, `handleEnd`, `handleStatus`.
- Reutiliza `TaskStateManager` existente sin cambios.

#### Fase 2: Actualizar catálogo

- En `tools-catalog.ts`:
  - Reemplazar `"decompose_tasks"`, `"update_task_status"`, `"complete_task_list"` por `"task"`.
  - Eliminar `"manage_pipelines"` de `AVAILABLE_TOOLS`.
  - Eliminar `TOOL_GROUPS.pipelines`.
  - Actualizar `TOOL_GROUPS.tasks = ["task"]`.

#### Fase 3: Actualizar tool factory y registro

- `ui.tool.ts`: cambiar `createDecomposeTasksTool` + `createUpdateTaskTools` por `createTaskTool`.
- `tool-factory.ts`: actualizar imports y llamadas.
- `tool-activation-engine.ts`: verificar que `"task"` esté en always-on.

#### Fase 4: Actualizar prompt-builder

- `prompt-builder.ts` inyecta instrucciones sobre las tools de task. Actualizar para referirse a `task` tool con acciones `start/update/end`.

#### Fase 5: Actualizar UI

- `FloatingTasks.tsx`: sin cambios (lee `TaskRunnerState`, no los nombres de tools).
- `ToolResultRouter.tsx`: actualizar cases de `decompose_tasks`/`update_task_status`/`complete_task_list` → `task`.
- `tool-row-utils.tsx`: actualizar labels e iconos.

#### Fase 6: Eliminar código muerto

- Eliminar `manage-pipelines.tool.ts`.
- Eliminar imports y referencias en `metadata-store.ts` (línea 103 mapea `"run_pipeline"` → `"manage_pipelines"`).
- Eliminar referencias en cualquier otro archivo.

#### Fase 7: Migración de sesiones existentes

- Si una sesión activa tiene `decompose_tasks`/etc en `serialTools`, migrar a `task` al cargar.
- `metadata-store.ts` debe manejar la migración de nombres de tools legacy.

---

## 8. Unificar la tool de memory en una sola `memory.tool`

### Estado actual

Tres tools separadas:

| Tool            | Función            |
| --------------- | ------------------ |
| `memory_store`  | Guardar memoria    |
| `memory_recall` | Recuperar memorias |
| `memory_forget` | Eliminar memoria   |

Todas usan `MemoryProvider` (interfaz compartida). La UI tiene `MemoryResult.tsx` con tres modos (`recall`, `store`, `forget`). El storage es SQLite con FTS5.

### Archivos relevantes

| Archivo                                                      | Rol                                 |
| ------------------------------------------------------------ | ----------------------------------- |
| `apps/server/src/core/memory/memory-tools.ts`                | `createMemoryTools()` — las 3 tools |
| `apps/server/src/core/memory/local-provider.ts`              | `LocalMemoryProvider` (SQLite)      |
| `apps/server/src/core/memory/registry.ts`                    | `MemoryRegistry`                    |
| `packages/shared/src/stores/memory-store.ts`                 | `IMemoryStore` interface            |
| `packages/shared/src/tools-catalog.ts`                       | `TOOL_GROUPS.memory`                |
| `apps/client/src/components/chat/tools/MemoryResult.tsx`     | UI de resultados                    |
| `apps/client/src/components/chat/tools/ToolResultRouter.tsx` | Router de resultados                |

### Plan de implementación

#### Fase 1: Crear `memory.tool.ts` unificado

- Nuevo archivo o modificar `memory-tools.ts`.
- Una sola tool registrada como `"memory"` con parámetro `action`:

```ts
// action: "read" (antes recall)
{ action: "read", query: string, limit?: number }

// action: "upsert" (antes store, con upsert semántica)
{ action: "upsert", content: string, type?: MemoryType, importance?: number, tags?: string[], id?: string }

// action: "delete" (antes forget)
{ action: "delete", id: string }
```

- Nota: `upsert` con `id` opcional permite tanto crear como actualizar. Si se pasa `id`, actualiza; si no, crea.

#### Fase 2: Extender `IMemoryStore` e `LocalMemoryProvider`

- Agregar método `upsert(id, content, type, importance, tags)`:
  - Si el ID existe → UPDATE.
  - Si no existe → INSERT con ese ID.
- Método `read` es alias de `recall` actual.
- Método `delete` es alias de `forget` actual.
- Mantener métodos legacy como deprecated internamente.

#### Fase 3: Actualizar catálogo

- `tools-catalog.ts`:
  - Reemplazar `"memory_store"`, `"memory_recall"`, `"memory_forget"` por `"memory"`.
  - `TOOL_GROUPS.memory = ["memory"]`.

#### Fase 4: Actualizar tool factory y enricher

- `tool-factory.ts`: `createMemoryTools()` → `createMemoryTool()` (singular).
- `session-memory-enricher.ts`: verificar que `memory.buildContext()` sigue funcionando sin cambios.
- `tool-activation-engine.ts`: actualizar nombre de tool.

#### Fase 5: Actualizar UI

- `MemoryResult.tsx`: renombrar modos `recall` → `read`, `store` → `upsert`, `forget` → `delete`.
- `ToolResultRouter.tsx`: consolidar 3 cases en 1.
- `tool-row-utils.tsx`: unificar labels e icono.

---

## 9. Eliminar el sistema de plugins, mover ajustes de UI a la configuración

### Estado actual

El sistema de plugins (`PluginManager` + `BasePlugin`) es **código muerto no operativo**:

- `PluginManager` se instancia en `agent-runtime.ts` con `AuditLogPlugin` y `MemoryEnricherPlugin`, pero **nunca se invoca**.
- Las funcionalidades que los plugins pretendían cubrir ya están implementadas por otras vías:
  - Auditoría: `after-tool-call-hook.ts` → `recordToolCallAudit()`.
  - Memoria: `session-memory-enricher.ts` → monkey-patching de `session.prompt`.
- `WsNotifyPlugin` nunca se importa en ningún lado.
- La UI (`PluginsPage`) muestra 2 "plugins" (Memory, Exa Search) que en realidad son toggles de settings.

### Archivos relevantes

| Archivo                                                  | Rol                                    |
| -------------------------------------------------------- | -------------------------------------- |
| `packages/shared/src/plugins/base-plugin.ts`             | `BasePlugin` (dead code)               |
| `packages/shared/src/plugins/plugin-manager.ts`          | `PluginManager` (dead code)            |
| `apps/server/src/core/plugins/audit-log.plugin.ts`       | `AuditLogPlugin` (dormant)             |
| `apps/server/src/core/plugins/memory-enricher.plugin.ts` | `MemoryEnricherPlugin` (dormant)       |
| `apps/server/src/core/plugins/ws-notify.plugin.ts`       | `WsNotifyPlugin` (dead)                |
| `apps/server/src/core/session/agent-runtime.ts`          | Instancia PluginManager (nunca usado)  |
| `packages/spaces-sdk/src/index.ts`                       | Exporta `BasePlugin`, `PluginManager`  |
| `apps/client/src/pages/PluginsPage.tsx`                  | UI de "plugins" (en realidad settings) |
| `apps/client/src/pages/PluginsPage.literals.ts`          | i18n                                   |
| `apps/client/src/router/routes.tsx`                      | Ruta `/plugins`                        |
| `apps/server/src/routes/settings.ts`                     | `GET/PATCH /api/settings`              |

### Plan de implementación

#### Fase 1: Mover "plugins" de PluginsPage a settings

Los dos "plugins" actuales:

1. **Memory** (toggle `memoryEnabled` + `memoryAutoStore`):
   - Ya se guardan en `settings.json` vía `PATCH /api/settings`.
   - Ya existe `GeneralModelSection` en Settings.
   - **Acción**: Agregar una sección "Memory" en la pestaña General de `SettingsPage` con estos toggles.

2. **Exa Search** (toggle global en localStorage):
   - Actualmente usa `storage.get("exaSearchActive")`.
   - **Acción**: Migrar a `settings.json` como `exaSearchEnabled`, exponer en `PATCH /api/settings`, mover toggle a Settings > General.

#### Fase 2: Eliminar PluginsPage y ruta

- Eliminar `apps/client/src/pages/PluginsPage.tsx` y `PluginsPage.literals.ts`.
- Eliminar ruta `/plugins` de `routes.tsx`.
- Eliminar `PluginsRoute` de `AdministrativeLeaves.tsx`.
- Eliminar entrada de "Plugins" en `SessionSidebar` y `MobileBottomBar`.

#### Fase 3: Eliminar código del sistema de plugins del servidor

- Eliminar `apps/server/src/core/plugins/` (los 3 archivos + barrel).
- Eliminar imports y creación de `PluginManager` en `agent-runtime.ts` (líneas 263-267).
- Eliminar `BasePlugin` y `PluginManager` de `packages/shared/src/plugins/` (o deprecar con comentario).
- Si se eliminan de shared, actualizar `packages/spaces-sdk/src/index.ts` para no exportarlos.

#### Fase 4: Deprecar exports del SDK

- Si se decide no eliminar de shared aún (para no romper consumidores externos del SDK):
  - Marcar `BasePlugin` y `PluginManager` como `@deprecated` en JSDoc.
  - Agregar comentario: "The plugin system is deprecated. Use custom tools and entity config hooks instead."
  - Planificar eliminación en próxima versión mayor.

#### Fase 5: Verificación de integridad

- `pnpm build` debe pasar limpiamente.
- `pnpm --filter server run typecheck` sin errores.
- `pnpm --filter client run typecheck` sin errores.
- Verificar que las settings de Memory y Exa Search se guarden y carguen correctamente desde Settings > General.
- Verificar que los toggles afecten efectivamente la disponibilidad de tools (memory tools, exa_search).

---

## 10. (Reservado para futuros items)

---

## Orden recomendado de implementación

1. **#9 — Eliminar plugins** (limpieza, bajo riesgo, prepara el terreno)
2. **#4 — Historial de mensajes con flechas** (quick win, alto impacto UX)
3. **#7 — Unificar task tools** (refactor interno, elimina deuda)
4. **#8 — Unificar memory tool** (refactor interno, consistencia)
5. **#3 — Default model/provider** (feature nuevo, valor inmediato)
6. **#1 — Abstracción custom tools** (refactor grande, base para #6)
7. **#6 — Custom tools con aprobación** (depende de #1)
8. **#5 — Galería de equipos** (feature nuevo, contenido + backend)
9. **#2 — Team-scoped agents** (cambio arquitectónico, máxima complejidad)

------

Problemas:
- Al hacer click en ell boton de cancel en el chat mientras se esta corriendo una tool, es verdad que la ejecucion se cancela, pero en la ui la tool se queda como running para siempre. Si la tool era una pregunta o aprobacion, el attention hub no se reestablece.
- En la modal de configuracion de agente, al clickar en la tab de ver el prompt, que por cierto se muestra abajo cuando deberia estar arriba, la modal se cierra
