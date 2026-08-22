# Reporte de Gaps — Funcionalidades del frontend web no cubiertas por los planes Mobile 0-10

**Fecha**: 2026-08-22
**Ámbito auditado**: `apps/client/src` (rutas, páginas, componentes, hooks y flujos reales)
**Contraste**: planes `plans/mobile-00-scaffolding.md` a `mobile-10-polish-release.md`
**Metodología**: mapeo de rutas + auditoría con 5 subagentes de exploración (chat, paneles de contexto, navegación/layout, páginas administrativas, entidades/workflows)

---

## 1. Resumen ejecutivo

El plan Mobile cubre solo el **esqueleto** de cada pantalla. La capa de funcionalidad fina del web es un orden de magnitud mayor y casi ninguna está en los hitos 0-10.

**Hallazgos clave**:
1. **Chat (H5)** es el hito más subestimado: faltan input avanzado, ramas de mensaje, tool calls ricas (~30 renderers), UI custom declarativo, aprobaciones inline, task runner, context meter y exportación.
2. **Settings (H8)** planifica General + Providers + Security/logout, pero el web tiene **6 áreas administrativas completas sin plan** (Env Vars, credentials HTTP, modelos multimodales con tests, backup, custom tools, subagentes/memoria/exa).
3. **No existe modelo de contexto en mobile**: el web es centrado en contexto (proyecto/agente/equipo con tabs Files/Delegations/Timeline/Preview/Org + session resolver); el plan es plano.
4. **Páginas que el plan nombra solo como placeholders de drawer** (Schedules, Skills, Logs, MCP) son features completos con ~25 endpoints en el web.
5. La pantalla `/sessions` del web tiene **3 tabs completos** (Kanban, Analytics, Console) — el plan H4 solo arma una lista.

---

## 2. Estado de cobertura por hito

| Hito Mobile | Equivalente web | Estado |
|---|---|---|
| H0–H2 | Scaffolding, `LoginPage`, `DashboardPage` | ✅ cubierto |
| H3 | `MainLayout` + sidebar | ⚠️ falta modelo de contexto |
| H4 | `SessionsPage` (solo el tab "lista") | ⚠️ faltan Kanban/Analytics/Console + gestión avanzada |
| H5 | `ChatArea`, `useChatAreaState`, `useChatInputForm` | ⚠️ esqueleto solamente |
| H6 | `ProjectsPage`, `AgentsPage`, `useEntityConfig` | ⚠️ faltan floor, assignment, gallery, serialTools |
| H7 | `AttentionHub` / `GlobalApprovalOverlay` | ⚠️ patrón distinto (hub vs inline) |
| H8 | `SettingsPage` (General + Providers) | ⚠️ 6 áreas sin plan |
| H9 | `TeamsPage`, `TeamDetailPage`, `Workflows*` | ⚠️ falta chat multi-agente, analytics, org chart |
| H10 | Polish/release | ✅ cubierto |

---

## 3. A. Chat (H5) — el hito más subestimado

El H5 planifica: historial + streaming + markdown + tool-calls + input + attachments + stop. El chat web implementa mucho más:

| Feature web | Archivo | ¿En plan? |
|---|---|---|
| **Input avanzado**: autocomplete slash `/` y `@`, historial con flechas, Enter=Steer / Alt+Enter=Follow-up, autoresize | `useChatInputForm.ts`, `ChatInput.tsx`, `AutocompletePopover.tsx` | ❌ |
| **Ramas de mensajes** (`← 1/3 →`) + deep-link a sesiones hijas de subagente/delegación | `SystemMessage.tsx` (BranchNav), `useChatAreaState.ts` | ❌ |
| **Razonamiento / ThinkingBlock** colapsable + cursor parpadeante | `MessageBlocks.tsx` | ❌ |
| **Context meter + Compact** (anillo color por umbral, botón compactar) | `ContextButton.tsx`, `ContextIndicator.tsx` | ❌ |
| **Task Runner**: progress bar, pause/resume/cancel, dependencias | `FloatingTasks.tsx` | ❌ |
| **Aprobación de tools en línea** (Approve/Deny de tool requerida) | `SystemMessage.tsx` `ToolApprovalCard` | ❌ (H7 solo aprobaciones de agente, no de tools) |
| **Tools/skills por sesión en el input**: presets Autonomous/Standard/ReadOnly, tools gated sin API key | `ToolsPopover.tsx`, `useEntityToolsConfig.ts` | ❌ (H6 es por entidad, no por sesión) |
| **Banners**: reconexión ("messages will be queued"), errores de agente, modo Solo Lectura (CLI/API/channel) | `ChatHeader.tsx` | ❌ |
| **Pills de sugerencias + saludo dinámico** en pantalla de bienvenida | `WelcomeChatInput.tsx` | ❌ |
| **Footer de mensaje**: provider/model/tokens/cost + copy mensaje | `MessageGroup.tsx` | ❌ |
| **Exportar conversación** (Markdown/JSONL/JSON) | `useMainLayoutState.ts`, `MainLayout.tsx` | ❌ |
| **Attach avanzado**: docs <100KB inyectados como code block con lenguaje detectado, subida multipart a `/api/workspace/assets/uploads` | `ChatInput.tsx` `processAttachments` | ⚠️ parcial (H5 solo imágenes) |
| **Markdown rico**: file trees, links `workspace-file://`, copy por code-block, GFM tables | `RichMarkdown.tsx` | ⚠️ parcial |

---

## 4. B. Renderizado de tool calls — el agujero más grande

H5 define "ToolCallCard colapsable con nombre/args/resultado". El web tiene **~30 renderers especializados** despachados por `ToolResultRouter`:

- **Custom UI declarativo**: `CustomUiRenderer` renderiza `{type,...props}` que el agente emite → Badge, Card, CardList, Table, Metric, Code, Section, **CustomHtml en iframe sandbox**, Video, Audio, Pdf, Tabs, Markdown, Progress, **Diff side-by-side**, Steps, Stats, Timeline. **Nada de esto existe en mobile ni en plan.**
- **Aprobar/responder en el flujo**: `ApprovalForm` (severidad info/warning/critical, timeout 15s, resuelve vía WS) y `AskQuestionForm` (multi-select + custom answer) — el plan H7 los saca del chat y los mete en un hub, rompiendo el patrón inline del web.
- **Consola de subagente en vivo** (`SubagentLiveView`, eventos por toolCallId).
- **`EditResult` con diff** (parseo de hunks, líneas +/-/números de línea), `GrepResult` con resaltado de patrón, `BashResult`, `WriteResult`, `ReadResult` (lightbox de imágenes), `ChartView` (recharts bar/line/pie/area), `HtmlPreview` (browser chrome + botón download), `ImageGrid` (lightbox, download all, lazy), `MemoryResult` (3 modos), `ShareFileCard`, `FactoryResult` (genera agentes/proyectos/skills → abre workspace).
- **`ToolResultInspector`**: media inline (html/pdf/audio/video/office con iframes) + extractor de file markers `=== Title ===`.

**Conclusión**: sin el renderer de UI custom + los forms interactivos, cualquier Hito 5 "equivalente a ChatArea" queda funcionalmente amputado.

---

## 5. C. Modelo de contexto — gap arquitectónico (H3/H6/H9)

El plan mobile es **plano**: bottom-nav → pantallas. El web es **centrado en contexto**:

- Contexto activo único (proyecto **O** agente **O** equipo), persistido en localStorage y derivado de la URL (`useWorkspaceContext.ts`).
- **Tabs por contexto**: Chat / Files / Delegations / Timeline / Preview / Org chart.
- **Session resolver** (`useSessionResolver`, `getSessionPath`): entrar a `/session/:id` resuelve el contexto y navega.
- **Chat por equipo multi-agente** (`TeamChatArea`, streaming `team_message`).

Solo H2/H4 tocan sesiones sueltas. El grueso de la app — "chat dentro de un contexto con tabs" — no tiene plan en mobile.

---

## 6. D. Funcionalidades por entidad que exceden los CRUD básicos

### Projects (H6 dice list + create)
- `cloneUrl` (clonar repo remoto), tag, avatar, danger-zone de borrado.
- **ProjectAssignment** (`ProjectAssignmentPanel.tsx`): líder + miembros; **el system-prompt del líder se inyecta automático en las sesiones del proyecto**.

### Agentes (H6 básico)
- **Gallery de blueprints** (`GET /api/gallery/blueprints`, `installBlueprint`).
- **serialTools** (predeterminado `["request_approval","ask_question"]`), systemPrompt editing + tab "Inspect Prompt", stop/delete.

### Teams (H9 básico)
- **Chat de equipo multi-agente** con streaming (`TeamMessages`, `TeamInput`).
- **Analytics de equipo** + PieChart `turnsPerAgent` (`GET /api/teams/:id/analytics`).
- **Org chart con ReactFlow** (desktop) — **el fallback mobile ya existe en web** (`OrgFlowMobile.tsx`).

### Workflows (H9 solo run + runs + read-only)
- El `WorkflowDetailPage` real tiene **3 tabs**: **Playground** (inputs + `dryRun`), **Editor** (diseño), **Executions** (historial + WS `workflow_run_*`, `workflow_step_*`).
- El **editor de nodos** sigue excluido por decisión (OK), pero Playground/dryRun/inputs también quedan fuera del plan.

---

## 7. E. Páginas administrativas — 6 áreas completas sin plan

El H8 (Settings) y el drawer H3 nombran "Skills/Schedules/MCP/Logs" pero **ningún hito los implementa**. Cada uno es un feature completo:

| Área | Funcionalidad | Endpoints (backend) |
|---|---|---|
| **Env Vars** | add/delete/reveal, editor bulk `.env` | `/api/env*` |
| **Credentials HTTP** (nodos de workflow) | bearer/basic/api-key cifradas | `/api/credentials` |
| **Modelos avanzados** | default provider+model, modelo **visión con test diagnóstico** (sube imagen), **image-gen con test**, **video-gen con test** | `/api/settings/test-vision`, `test-image-gen`, `test-video-gen` |
| **Backup/portabilidad** | export ZIP light/full, import merge/overwrite con modal destructivo (escribir "OVERWRITE") | `/api/backup/*` |
| **Skills manager global** + **Custom tools** (crear tool con Tool.md + Handlebars UI + executeType `ui\|script\|pipeline\|agent` + requiresApproval) | | `/api/skills`, `/api/custom-tools` |
| **Subagentes + memoria + Exa** | maxDepth 0-5, prompt previews, memoryEnabled/AutoStore, exaSearchEnabled | `PATCH /api/settings` |
| Theme (dark/light/system) + Locale (EN/ES) | solo localStorage | — |

### MCP Marketplace (accesible desde Settings tab y `/mcps`)
- Gallery con **install de catálogo**, connect/disconnect de servidores, **test de conexión**.
- **Servers custom** (transporte stdio/http con env `$WORKSPACE_DIR`).
- **Raw editor del `mcp-servers.json`** (`POST /api/mcp`).

### Schedules (completo en web, cero en plan)
- Jobs con scope (global/project/agent/team), cadencia (intervalo/presets diario/semanal/mensual/anual/**cron 5 partes**), Run Now, enable/disable, y **run history con outputs + cancel**.

### Skills page
- Listar/buscar/ver SKILL.md/copiar/**Reset** con flag `disableModelInvocation` (badge "Explicit Only").

### Logs Console (`SessionConsoleView`)
- Stream WS `global_log` en vivo: user/agent/start/end/text_delta/thinking_delta/tool_start/tool_end/error.
- Filtros de fuente (all/session/channel), toggles Mensajes/Razonamiento/Herramientas, congelar auto-scroll, máx 500 eventos.

---

## 8. F. Gestión de sesiones (H4)

H4: lista + filtros + crear + swipe-delete. Faltan:
- **Archivar/desarchivar** (`SessionPopover.tsx`).
- **Borrado en cascada con navegación** a la primera sesión restante.
- Sesiones **por contexto** (crear "X - Session N").
- Toggles de ejecuciones API/CLI (`exec_`).
- **Auto-renombre con el primer mensaje** (`useChatAreaState.ts`).
- Estados de sesión por dot (active/streaming/task-running/sleeping).

---

## 9. G. Tabs de `/sessions`

El web: **Kanban (idle/working/done), Analytics, Console** — el hub central de la app.
- **Kanban**: `SessionsKanbanPage` + `KanbanColumn` (`SessionsContext.tsx`), vista viva de agentes por estado.
- **Analytics**: `AnalyticsPage`.
- **Console**: `SessionConsoleView`.

El plan H4 solo arma la lista. Todo el tab principal y los otros 2 no tienen equivalente.

---

## 10. Resumen y recomendación

**Lo crítico** (sin esto el mobile no es "el mismo producto"):
1. **Custom UI renderer + interactive forms** (`ApprovalForm`/`AskQuestionForm`) — núcleo de la UX del chat.
2. **Modelo de contexto** (proyecto/agente/equipo + tabs Files/Delegations/Timeline + session resolver).
3. **Workspace file manager** y **Preview pipeline**.
4. **Kanban + Console + Analytics** de `/sessions`.

**Lo importante** (producto completo): input avanzado (slash/@, steer/follow-up), tool calls ricas, team chat multi-agente, ProjectFloor, org chart, run history de workflows, credentials HTTP, backup, MCP marketplace, Schedules, gallery de blueprints.

**Exclusiones por decisión a validar**:
- **Workflow editor** (editor de nodos) — documentado en H9, pero Playground/dryRun también quedan fuera.
- **Team chat / analytics de equipo** en H9.

---

## 11. Referencias de archivos clave

- Chat: `apps/client/src/components/chat/` (`ChatInput.tsx`, `MessageBlocks.tsx`, `tools/ToolResultRouter.tsx`, `tools/custom/CustomUiRenderer.tsx`, `tools/ApprovalForm.tsx`, `tools/AskQuestionForm.tsx`, `FloatingTasks.tsx`, `ContextButton.tsx`)
- Contexto: `apps/client/src/hooks/useWorkspaceContext.ts`, `useSessionResolver.ts`, `components/layout/tabs/ContextTabBar.tsx`
- Contexto sub-agent: `components/chat/DelegationsPanel.tsx`, `TimelineTabPanel.tsx`, `components/workspace/WorkspacePanel.tsx`, `components/preview/PreviewPanel.tsx`, `components/projects/ProjectFloorPanel.tsx`, `ProjectAssignmentPanel.tsx`
- Entidades: `pages/AgentsPage.tsx` (Gallery), `components/teams/TeamChatArea.tsx`, `pages/TeamDetailPage.tsx`, `components/teams/OrgFlowCanvas.tsx` / `OrgFlowMobile.tsx`, `pages/WorkflowDetailPage.tsx`
- Admin: `pages/SettingsPage.tsx` (+ `GeneralTab` con `GeneralModelSection`, `GeneralDangerZone`, `EnvVarsTab`, `CredentialsSection`), `pages/MCPMarketplacePage.tsx`, `pages/SchedulesPage.tsx`, `pages/SkillsPage.tsx`, `pages/LogsConsolePage.tsx`, `components/sessions/SessionConsoleView.tsx`