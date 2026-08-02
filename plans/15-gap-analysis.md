# Gap Analysis — Funcionalidades de the-spaces Pendientes en la Migración a Core

> Comparación exhaustiva entre las funcionalidades actuales de `the-spaces` y lo cubierto por el Plan 15 (`plans/15-core-architecture-migration.md`) y la arquitectura objetivo (`out/auto-browser/PLAN.md`).

---

## Resumen Ejecutivo

| Métrica                                                     | Cantidad |
| ----------------------------------------------------------- | -------- |
| Features totales identificadas en the-spaces                | ~90      |
| Cubiertas explícitamente por el plan                        | 15       |
| Cubiertas parcialmente (requieren adaptación significativa) | 8        |
| Excluidas explícitamente en Hito 5 (ruta "no migra")        | 4        |
| **Ausentes del plan (sin mención alguna)**                  | **~63**  |

---

## 1. Features Cubiertas Explícitamente ✅

| #   | Feature                          | Hito    | Detalle                                                                                                                                     |
| --- | -------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Chat con streaming vía WebSocket | 5, 6, 7 | `AgentRuntime.prompt()` + WS handler + `useChat` hook                                                                                       |
| 2   | Sesiones CRUD básico             | 5, 6    | `POST/GET/DELETE /sessions`, `ISessionStore`, `useSessions`                                                                                 |
| 3   | Agent Runtime desacoplado        | 2       | `AgentRuntime` compone `IModelProvider`, `IToolExecutor`, `IPromptBuilder`, `IHookRunner`, `IPermissionEngine`, `ISessionStore`, `EventBus` |
| 4   | Tools filesystem                 | 4       | `read`, `write`, `edit`, `glob`, `grep`, `bash`, `webfetch` migradas a `ITool` con Zod                                                      |
| 5   | Providers genéricos              | 3       | `OpenAICompatibleProvider` simplificado (un provider, múltiples base URLs)                                                                  |
| 6   | Storage (Memory + Filesystem)    | 3       | `MemorySessionStore`, `FilesystemSessionStore` implementan `ISessionStore`                                                                  |
| 7   | Sandbox local                    | 3       | `LocalSandbox` + `RestrictedPaths`                                                                                                          |
| 8   | Client UI base                   | 6, 7    | `Layout`, `SessionList`, `ChatArea`, `MessageList`, `MessageBubble`, `ChatInput`, `Markdown`                                                |
| 9   | WebSocket base                   | 5, 6    | WS handler con forward de `AgentEvent` al cliente, `WsClient` con reconexión                                                                |
| 10  | MCP Integration                  | 8a      | `McpToolAdapter` implementa `ITool`, `McpHook` para logging                                                                                 |
| 11  | Approvals                        | 8b      | `ApprovalHook` implementa `Hook.beforeToolCall` → `null` si deniega                                                                         |
| 12  | Schedules                        | 8c      | `ScheduleService` inyectable, rutas `/schedules` con sub-router                                                                             |
| 13  | Teams / Multi-agent              | 8d      | `createTeamAgent()` factory, `DelegationHook`, delegación                                                                                   |
| 14  | Memory / RAG                     | 8e      | `MemoryPromptSection` implementa `PromptSection`, `IMemoryProvider`                                                                         |
| 15  | Custom Tools                     | 8f      | `CustomToolAdapter` implementa `ITool` con schema Zod dinámico                                                                              |

---

## 2. Features con Cobertura Parcial 🟡

Requieren una adaptación significativa más allá de lo que el plan describe.

| #   | Feature                            | Qué cubre el plan                                          | Qué falta                                                                                                                                                                                                                                                                                                                                          |
| --- | ---------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Model Registry (9 proveedores)** | `OpenAICompatibleProvider` genérico único (Hito 3)         | UI de configuración de 9 proveedores, `LLMRegistry` con pattern matching, `ProviderCapabilities` (streaming, tools, vision, structured output), `ProviderModelInfo` con costos/context windows, API key management individual, dynamic model fetching. El plan dice explícitamente "simplificar a un provider genérico".                           |
| 2   | **Skills System**                  | `PromptSection` puede representar skills (Hito 2)          | SKILL.md loading desde filesystem, `/api/skills` con filtro por entityType/entityId, `EntitySkillsEditor` UI, skill reset a factory defaults, multi-scope skills (global/project/agent/team), `SkillsPopover` y `SkillsSelector` en el chat input.                                                                                                 |
| 3   | **Plugins System**                 | `Hook` system puede cubrir parte (Hito 2)                  | `BasePlugin` con 8 lifecycle hooks, `PluginManager` con orden por prioridad, plugins existentes (AuditLog, MemoryEnricher, WsNotify), `PluginsPage` UI con toggles.                                                                                                                                                                                |
| 4   | **Permission Engine**              | `IPermissionEngine` + `PermissionEngine` (Hito 2)          | DENY-FIRST rules del sandbox actual (`rm -rf`, fork bombs, sensitive paths), `UserPermissionStore` con overrides, `SubagentPermissions`, reglas cargables desde `.rules/`, bash output filter.                                                                                                                                                     |
| 5   | **Event Bus / Observability**      | `IEventBus<AgentEvent>` (Hito 2)                           | Event broker con ring buffer (150 eventos), audit log JSONL (`env-access.log`, `tool-calls.jsonl`), `[BASH_AUDIT]` structured logging, `ObservabilityService` con métricas agregadas, circuit breaker tracking.                                                                                                                                    |
| 6   | **Context Estimation**             | `AgentRuntime.getContextUsage()` (Hito 2)                  | Token estimation real con `estimateContextTokens()`, fallback heurístico, `ContextMeter` UI, `get_context_usage` WS message type.                                                                                                                                                                                                                  |
| 7   | **WebSocket Protocol**             | Forward de `AgentEvent` (Hito 5)                           | 14 client→server message types actuales (auth, steer, follow_up, compact, team_join, team_send, team_abort, approvals_get, ui_action, etc.), 28 server→client types (team_agent_start/token/thinking/tool_start/end, preview_status/build_log, global_log, tasks_update, delegation_started/completed, etc.). El plan reduce a `prompt` + `abort`. |
| 8   | **Workspace/Sandbox de archivos**  | `ISandbox` con `readFile`/`writeFile`/`listFiles` (Hito 3) | `IWorkspaceProvider` con `resolvePath`/`watch`/`sync`, file tree browser UI, code editor, upload con progreso, file URL resolution, avatar uploads para todas las entidades.                                                                                                                                                                       |

---

## 3. Features Excluidas Explícitamente en Hito 5 🔴

El plan dice literalmente: _"Rutas que NO migran en este hito: `/teams`, `/schedules`, `/approvals`, `/mcp`, `/backup`, `/preview`, `/files`, `/gallery`"_. De estas, 4 no son retomadas en ningún hito posterior:

| #   | Feature                               | Ruta                                                              | Estado actual                                                                                                                | Notas                                                                                                                                                                                                                   |
| --- | ------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Workspace de Archivos + Proyectos** | `/files` (mounted as `/api/workspace`, `/api/workspace-projects`) | 20+ endpoints (CRUD archivos, upload, rename, proyectos con status machine, assignment leader/members, clone git, avatares)  | Mencionado como "no migra" en Hito 5. No retomado en Hito 8 ni 9. El cliente tiene `WorkspacePanel`, `WorkspaceFileTree`, `WorkspaceFileEditor`, `ProjectFloorPanel`, `ProjectSettingsModal`, `ProjectAssignmentPanel`. |
| 2   | **Preview Server**                    | `/preview`                                                        | Build + serve de proyectos con detección de framework, path-based isolation, HTML rewriting, WS de build logs en tiempo real | No retomado. El cliente tiene `PreviewPanel` con start/stop, logs y preview URL.                                                                                                                                        |
| 3   | **Gallery / Blueprints**              | `/gallery`                                                        | Catálogo de blueprints comunitarios, one-click install, blueprint icons                                                      | No retomado. El cliente tiene `Gallery` integrado en settings.                                                                                                                                                          |
| 4   | **Backup / Restore**                  | `/backup`                                                         | Export ZIP (light/full), import con merge/overwrite, safe ZIP extraction                                                     | No retomado. El cliente tiene UI de backup en `PluginsPage`.                                                                                                                                                            |

---

## 4. Features Completamente Ausentes del Plan 🔴

No reciben mención alguna en el plan de migración ni en la arquitectura objetivo.

### 4.1 Auth & Seguridad de Acceso

| #   | Feature                     | Detalle                                                                                                                                                                                              |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Better-Auth integration** | Login, register, logout, changePassword. First-run registration. Session tokens (cookie + WS). `auth` middleware en todas las rutas. El servidor actual monta Better-Auth handler en `/api/auth/**`. |
| 2   | **Programmatic Sessions**   | Sessions creadas sin UI para schedules, tools y ejecución automatizada. Token-based auth alternativo.                                                                                                |
| 3   | **Security Headers**        | HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection como middleware Hono.                                                                                          |
| 4   | **Rate Limiting**           | Per-IP/endpoint (300 req/min general, 10 req/min auth). Headers `X-RateLimit-*` y `Retry-After`.                                                                                                     |
| 5   | **CORS configurable**       | `ALLOWED_ORIGINS`, resolución de orígenes dinámica.                                                                                                                                                  |
| 6   | **Request ID**              | UUID por request, propagado en headers y logs.                                                                                                                                                       |

### 4.2 Modelos y Providers (más allá del genérico)

| #   | Feature                       | Detalle                                                                                                                        |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 7   | **Catálogo de 9 proveedores** | OpenAI, Google Gemini, xAI/Grok, DeepSeek, Groq, Mistral, OpenRouter, Qwen, OpenCodeGo. UI de configuración en `ProvidersTab`. |
| 8   | **API Key management**        | Set/delete API keys por provider, encriptadas con AES-256-GCM. Endpoints `/api/providers/:id/key`.                             |
| 9   | **Dynamic model fetching**    | `/api/providers/:id/refresh` para providers compatibles (OpenRouter, etc.).                                                    |
| 10  | **Model testing UI**          | Test de modelos de texto, visión, imagen y video desde `/api/settings/test-*`.                                                 |

### 4.3 Generación de Medios

| #   | Feature              | Detalle                                                                                                        |
| --- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| 11  | **Image Generation** | `generate_image` tool (Qwen + OpenRouter). `ImageGenerationService`. Modelos listados en `/api/models/images`. |
| 12  | **Video Generation** | `generate_video` tool (OpenRouter). Modelos listados en `/api/models/videos`.                                  |
| 13  | **Vision Tool**      | `vision` tool para análisis de imágenes. `/api/settings/test-vision`.                                          |

### 4.4 Búsqueda Web

| #   | Feature                | Detalle                                                                                                                                                                                                     |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14  | **Exa Search**         | `exa_search` tool con API de Exa. Integración con settings.                                                                                                                                                 |
| 15  | **Web Fetch avanzado** | SSRF protection (localhost/private IP blocking), per-hostname rate limiter (30 req/min, 3 concurrentes), response caching, HTML extraction. El plan menciona `webfetch` básico pero sin estas protecciones. |

### 4.5 Compaction & Context Management

| #   | Feature                | Detalle                                                                                                                                                         |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | **Compaction Manager** | AI-driven session compaction con trigger automático por tamaño de contexto. 798 líneas de lógica en vendor. Branch summarization. El `compact` WS message type. |
| 17  | **Context Estimator**  | `estimateContextTokens()` con fallback heurístico (chars/4). Lee el contexto real del modelo.                                                                   |

### 4.6 Navigation & Message Tree

| #   | Feature                   | Detalle                                                                                                                  |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 18  | **Navigation Controller** | `steer()` mid-stream, `followUp()`, `navigateBranch()` por targetId. `POST /sessions/:id/navigate`.                      |
| 19  | **Message Tree**          | Mensajes con `parentId` y siblings. Branch navigation. La persistencia actual soporta `branch()` en `JsonlSessionStore`. |
| 20  | **Session Export**        | `GET /sessions/:id/export` en formatos json, jsonl, markdown.                                                            |

### 4.7 Task Runner & Pipelines

| #   | Feature                | Detalle                                                                                                                                                      |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 21  | **Task Decomposition** | `decompose_tasks` tool. `update_task_status` tool. `complete_task_list` tool. Task runner state machine (idle → decomposing → running → paused → completed). |
| 22  | **Floating Tasks UI**  | `FloatingTasks` component con progress, pause/resume toggle, task list display.                                                                              |
| 23  | **Pipeline Engine**    | `manage_pipelines` tool. Pipeline stages (Script + Agent). Stage result tracking. Pipeline run records.                                                      |

### 4.8 Entity Config Cascade

| #   | Feature               | Detalle                                                                                                     |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| 24  | **Config Cascade**    | `global → project → team → agent → session`. `CascadeConfigLoader` + `ConfigMerger`.                        |
| 25  | **Entity Config API** | `GET/PUT /api/config/:entityType/:entityId` + `/resolved`.                                                  |
| 26  | **Entity Config UI**  | `EntityConfigEditor` integrado en settings de Global, Proyectos, Agentes y Equipos. `useEntityConfig` hook. |

### 4.9 Tool Scoping por Entidad

| #   | Feature                  | Detalle                                                                                                                                 |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 27  | **Scope Config Manager** | Tool allow/deny por scope (global/project/team/agent). `GET /api/agents/scope/tools`. `PATCH /api/agents/scope/tools`.                  |
| 28  | **Entity Tools UI**      | `EntityCustomToolsEditor` con subtractive inheritance (global enable → project disable → agent re-enable). `useEntityCustomTools` hook. |

### 4.10 SDK & Abstracción ADK

| #   | Feature             | Detalle                                                                                                                                                |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 29  | **SpacesAgent**     | Clase declarativa portable: `new SpacesAgent({ name, model, instruction, tools })`.                                                                    |
| 30  | **SpacesRunner**    | Batch runner con `runner.stream()` standalone, sin HTTP/WS.                                                                                            |
| 31  | **Tool Factories**  | `createBashTool()`, `createReadTool()`, `createWriteTool()`, etc.                                                                                      |
| 32  | **SpacesHost**      | `ServerSpacesHost` para operaciones host-level. `SpacesHost` interface.                                                                                |
| 33  | **SDK Package**     | `packages/spaces-sdk` — surface pública de extensibilidad (re-exporta `BaseTool`, `BasePlugin`, `LLMRegistry`, `ToolRegistry`, `PluginManager`, etc.). |
| 34  | **ARCHITECTURE.md** | Documento de arquitectura abierta para empaquetado como biblioteca open source.                                                                        |

### 4.11 Factory System

| #   | Feature              | Detalle                                                                                       |
| --- | -------------------- | --------------------------------------------------------------------------------------------- |
| 35  | **Factory Tool**     | `manage_factory` tool para crear/actualizar/eliminar entidades (agentes, equipos, proyectos). |
| 36  | **Entity Contracts** | `/api/factory/contracts` + `/api/factory/contract/:entity`.                                   |
| 37  | **Factory Skills**   | `default-factory-skills.ts` con skills built-in. Reset a factory defaults desde UI.           |

### 4.12 UI Avanzada (no cubierta en Hito 7)

| #   | Feature                           | Componentes actuales                                                                                                                                                                  | Detalle                                                                                                                                                                                        |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 38  | **Dashboard**                     | `DashboardPage` (735 líneas)                                                                                                                                                          | Prioriza sesiones activas y proyectos recientes. Métricas rápidas.                                                                                                                             |
| 39  | **Kanban Board**                  | `SessionsKanbanPage` (376 líneas)                                                                                                                                                     | Sesiones en columnas idle/working/done. Derivado de `session_status` WS events.                                                                                                                |
| 40  | **Timeline View**                 | `TimelineTabPanel` + `SessionTimeline` (296+296 líneas)                                                                                                                               | Eventos de sesión en línea temporal.                                                                                                                                                           |
| 41  | **Analytics**                     | `AnalyticsPage` (519 líneas)                                                                                                                                                          | Tokens, tool calls, errores por día/modelo/tool. Gráficos.                                                                                                                                     |
| 42  | **Session Console / Logs**        | `SessionConsoleView` (316 líneas) + `LogsConsolePage`                                                                                                                                 | Eventos globales en tiempo real con filtrado (all/sessions/channels).                                                                                                                          |
| 43  | **Batch Operations**              | `POST /sessions/batch`                                                                                                                                                                | Archive/unarchive/delete masivo de sesiones.                                                                                                                                                   |
| 44  | **Custom UI Renderer**            | 22 componentes en `components/chat/tools/custom/`                                                                                                                                     | Accordion, Audio, Badge, Card, CardList, Code, CustomHtml, Diff, Markdown, Metric, PDF, Progress, Section, Stats, Steps, Table, Tabs, Timeline, Video.                                         |
| 45  | **Tool Result Displays**          | 15+ componentes en `components/chat/tools/`                                                                                                                                           | BashResult, ChartView, DecomposeResult, EditResult, ExaSearchResult, FindResult, GrepResult, LsResult, MemoryResult, ReadResult, ShareFileCard, SubagentLiveView, WebFetchResult, WriteResult. |
| 46  | **Model Selector**                | `ModelSelector` (366 líneas)                                                                                                                                                          | Dropdown con búsqueda, agrupado por provider, con badges de capacidades.                                                                                                                       |
| 47  | **Tools Selector + Popover**      | `ToolsSelector` + `ToolsPopover`                                                                                                                                                      | Enable/disable tools por sesión con grupos.                                                                                                                                                    |
| 48  | **System Prompt Viewer**          | `SystemPromptViewer` (294 líneas)                                                                                                                                                     | Vista previa del system prompt armado por secciones. `/api/prompts/preview`.                                                                                                                   |
| 49  | **Attention Hub**                 | `AttentionHubPopover`                                                                                                                                                                 | Bell icon con popover de notificaciones. Pending approvals + questions. Resolución inline. `attention-store` con `useSyncExternalStore`.                                                       |
| 50  | **Breadcrumbs con Session Title** | `Breadcrumbs`                                                                                                                                                                         | Título de sesión activo en barra global. Navegación a sesiones padre. Eliminación de header redundante en ChatArea.                                                                            |
| 51  | **Welcome Chat Input**            | `WelcomeChatInput` (335 líneas)                                                                                                                                                       | Input inicial con model selector, tools popover, skills popover, suggestion pills, attachments.                                                                                                |
| 52  | **Delegation UI**                 | `DelegationsPanel` (414 líneas) + `FloatingDelegations`                                                                                                                               | Panel de delegaciones pendientes. Chips de estado flotantes. Navegación a sub-sessions.                                                                                                        |
| 53  | **Team UI Completa**              | `TeamChatArea` (364), `TeamMessageList` (225), `TeamMembersModal` (412), `TeamCreateModal` (255), `TeamSettingsModal` (352), `TeamOrgPage`, `OrgFlowCanvas`, `AgentDetailPanel` (292) | Chat multi-agente con streaming states por agente. ReactFlow org chart. Team analytics.                                                                                                        |
| 54  | **Avatar System**                 | `AvatarUploadField`, `AgentAvatar`, `EntityAvatar`                                                                                                                                    | Upload + preview de avatares para agentes, equipos, proyectos, factory.                                                                                                                        |
| 55  | **Mobile Support**                | `MobileTopbar`, `MobileBottomBar`, `MobileSidebarOverlay`, `useIsMobile`, `useNavigationStack`                                                                                        | Layout responsive completo con navegación mobile.                                                                                                                                              |
| 56  | **Theme Toggle**                  | `ThemeToggle`                                                                                                                                                                         | Dark/light mode.                                                                                                                                                                               |
| 57  | **i18n / Localization**           | `LiteralsContext`, `useLiterals`, archivos `.literals.ts` por componente                                                                                                              | Sistema de literales con English/Español. `LocaleSelector`.                                                                                                                                    |
| 58  | **Toast Notifications**           | `ToastContext`, `Toast` component                                                                                                                                                     | Sistema de notificaciones toast.                                                                                                                                                               |
| 59  | **MCP Marketplace**               | `MCPMarketplacePage` (700 líneas) + `MCPCard` + `MCPCustomForm`                                                                                                                       | Browse/install MCP servers del catálogo. Custom MCP configuration form.                                                                                                                        |
| 60  | **Landing Page**                  | `apps/landing/` — app independiente                                                                                                                                                   | Página de marketing con hero, capabilities, CTA. Sin dependencia de otros packages.                                                                                                            |

### 4.13 Infraestructura de Calidad & Open Source

| #   | Feature                   | Detalle                                                                                                                                             |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 61  | **CI/CD**                 | `ci.yml` (PR validation: license check, typecheck, lint, secret scan, build, test) + `release.yml` (Changesets automated release).                  |
| 62  | **Secret Scanning**       | `secretlint` con `.secretlintrc.json`. Pre-commit hook + CI step.                                                                                   |
| 63  | **Docker Support**        | `docker-entrypoint.sh`, docs/self-hosting.md con instrucciones Docker.                                                                              |
| 64  | **Open Source Artifacts** | MIT License, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (v2.1), `SECURITY.md`, issue/PR templates, SPDX header injection (`scripts/check-license.ts`). |
| 65  | **TypeDoc**               | `typedoc.json` para generación de docs de API desde `packages/shared` y `core/ports`.                                                               |
| 66  | **Changesets**            | `.changeset/config.json` para versionado semántico y releases automatizados.                                                                        |
| 67  | **Git Hooks**             | `lefthook.yml` con pre-commit (format, lint, typecheck, secret scan).                                                                               |

### 4.14 Seguridad Avanzada (no cubierta por sandbox básico)

| #   | Feature                  | Detalle                                                                                                                                                                          |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 68  | **Circuit Breaker**      | `CircuitBreaker` con estados CLOSED/OPEN/HALF-OPEN. 5 fallos → OPEN, 30s reset, 1 trial en HALF-OPEN. `CircuitBreakerRegistry` singleton. Protege llamadas a providers externos. |
| 69  | **Encrypted Env Vars**   | `env-crypto.ts` con AES-256-GCM. Clave derivada de `BETTER_AUTH_SECRET` vía SHA-256. Formato: `iv:auth-tag:ciphertext`.                                                          |
| 70  | **Bash Audit Logger**    | `[BASH_AUDIT]` structured logging: command, cwd, start/end, duration, exit code, output length, truncation flag.                                                                 |
| 71  | **Path Safety**          | `resolveSafePath()` con protección anti-directory traversal. Whitelist de directorios adicionales. Case-insensitive en Windows.                                                  |
| 72  | **Bash Output Filter**   | `bash-output-filter.ts` filtra datos sensibles del output de bash.                                                                                                               |
| 73  | **Subagent Permissions** | Reglas de permiso específicas para subagentes. Límites de profundidad. Herencia de permisos.                                                                                     |

---

## 5. Features de `packages/shared` no Migradas

El plan menciona "extraer solo session + message schemas" de `packages/shared`. Esto deja sin migrar:

| Archivo                                | Contenido no migrado                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `schemas.ts` (938 líneas, 50+ schemas) | Schemas de agentes, equipos, proyectos, MCP, preview, gallery, backup, schedules, pipelines, tasks, labs, factory, etc. |
| `tools-catalog.ts`                     | 33 tools en 10 grupos. `AVAILABLE_TOOLS`, `TOOL_GROUPS`, `DEFAULT_ALWAYS_ON_TOOLS`.                                     |
| `ws-messages.ts`                       | Contrato completo de WS con discriminators y 14 client→server + 28 server→client message types.                         |
| `models/`                              | `BaseLlmProvider`, `LLMRegistry`, `ProviderCapabilities`, `ProviderModelInfo`.                                          |
| `plugins/`                             | `BasePlugin`, `PluginManager`.                                                                                          |
| `stores/`                              | `IMemoryStore`, `IArtifactStore`.                                                                                       |
| `tools/`                               | `BaseTool`, `ToolDeclaration`, `FunctionTool`, `ToolRegistry`, `legacyToolToBaseTool`.                                  |
| `attention.ts`                         | `AttentionItem`, `AttentionKind`, `ResolveAttention`.                                                                   |
| `paths.ts`                             | 40+ funciones de filesystem layout.                                                                                     |
| `session-prefix.ts`                    | Constantes de prefijo de sesión (exec_, del_, sub_, team_, generate_).                                                  |

---

## 6. Resumen por Categoría de Impacto

### Impacto Funcional Alto (el producto pierde capacidades core)

- Auth → sin multi-usuario
- Proyectos → sin scoping de trabajo
- Backup/Restore → sin recuperación de datos
- Compaction → agentes con sesiones largas fallan por contexto
- Image/Video Generation → pérdida de herramientas creativas

### Impacto Funcional Medio (features avanzados no disponibles)

- Preview Server
- Gallery/Blueprints
- Task Runner/Pipelines
- Entity Config Cascade
- Factory System
- SDK público
- Navigation Controller

### Impacto de UX (experiencia degradada)

- Dashboard, Kanban, Timeline, Analytics → sin vistas de gestión
- Attention Hub, Breadcrumbs → navegación menos contextual
- Custom UI Renderer, Tool Result Displays → mensajes menos ricos
- Mobile Support → sin acceso móvil
- i18n → solo inglés
- Theme Toggle → sin dark mode
- WelcomeChatInput → onboarding menos guiado

### Impacto de Infraestructura (riesgo técnico)

- CI/CD → sin validación automatizada
- Secret Scanning → riesgo de leaks
- Circuit Breaker → sin protección de providers
- Bash Audit → sin trazabilidad de comandos
- Rate Limiting → sin protección DoS
- Security Headers → superficie de ataque ampliada

---

## 7. Recomendación

El plan actual (Hito 0-9) cubre el **~17%** de las funcionalidades de the-spaces. Para cerrar los gaps críticos, se sugiere:

1. **Agregar un Hito 10 — Auth & Multi-User**: Better-Auth migration, security middleware, rate limiting
2. **Agregar un Hito 11 — Project & File Workspace**: CRUD de proyectos + workspace de archivos con scoping
3. **Agregar un Hito 12 — Media & Search Tools**: Image/video generation, vision, Exa search, web fetch avanzado
4. **Agregar un Hito 13 — Compaction & Navigation**: Compaction manager, navigation controller, context estimation
5. **Agregar un Hito 14 — Task Runner & Pipelines**: Decomposition, task state machine, pipeline engine
6. **Agregar un Hito 15 — Entity Config & SDK**: Config cascade, tool scoping, SDK público, factory
7. **Agregar un Hito 16 — UI Avanzada**: Dashboard, kanban, timeline, analytics, custom UI renderer, mobile, i18n
8. **Agregar un Hito 17 — Infraestructura**: CI/CD, secret scanning, circuit breaker, docker, open source artifacts

**Features que probablemente no justifican migración inmediata**:

- Landing page (app independiente, puede migrarse aparte)
- Gallery/Blueprints (bajo uso, postergable)
- Preview Server (complejo, postergable)
- Backup/Restore (bajo uso, postergable)

---

## 8. Topología de Dependencias Visual

```
the-spaces actual                        Plan 15 + gaps propuestos
─────────────────                        ────────────────────────
apps/server (Hono + 20 rutas)     →      apps/server (thin)
  ├── /api/auth                     →      └── Hito 10 (auth)
  ├── /api/sessions ◎               →      └── Hito 5 ✓
  ├── /api/agents                    →      └── Hito 8d (teams)
  ├── /api/teams                     →      └── Hito 8d ✓
  ├── /api/models                    →      └── Hito 10 (models UI)
  ├── /api/providers                 →      └── Hito 3 + 10
  ├── /api/settings                  →      └── Hito 10
  ├── /api/skills                    →      └── Hito 11 (entity config)
  ├── /api/custom-tools              →      └── Hito 8f ✓
  ├── /api/env                       →      └── Hito 11
  ├── /api/backup ❌                  →      └── postergado
  ├── /api/logs                      →      └── Hito 17 (observability)
  ├── /api/mcp                       →      └── Hito 8a ✓
  ├── /api/gallery ❌                 →      └── postergado
  ├── /api/factory                    →      └── Hito 15
  ├── /api/approvals                  →      └── Hito 8b ✓
  ├── /api/config                     →      └── Hito 15
  ├── /api/schedules                  →      └── Hito 8c ✓
  ├── /api/prompts                    →      └── Hito 11
  ├── /api/preview ❌                 →      └── postergado
  ├── /api/workspace ❌               →      └── Hito 11
  ├── /api/workspace-projects ❌      →      └── Hito 11
  ├── /api/health                     →      └── Hito 5 ✓
  └── /ws (16 msg types)             →      └── Hito 5 + 8a-d

apps/client (170 archivos)         →     apps/client (thin)
  ├── Chat ◎                         →      └── Hito 7 ✓
  ├── Dashboard                       →      └── Hito 16
  ├── Kanban                          →      └── Hito 16
  ├── Timeline                        →      └── Hito 16
  ├── Analytics                       →      └── Hito 16
  ├── Workspace ❌                    →      └── Hito 11
  ├── Preview ❌                      →      └── postergado
  ├── Agents                          →      └── Hito 8d
  ├── Teams                           →      └── Hito 8d
  ├── Settings + Providers            →      └── Hito 10
  ├── Skills                          →      └── Hito 11
  ├── Plugins                         →      └── Hito 11
  ├── Schedules                       →      └── Hito 8c
  ├── Logs                            →      └── Hito 17
  ├── MCP Marketplace                 →      └── Hito 8a
  ├── Attention Hub                   →      └── Hito 8b
  ├── Custom Tools Editor             →      └── Hito 8f
  ├── Mobile Support                  →      └── Hito 16
  ├── i18n                            →      └── Hito 16
  └── Custom UI Renderer              →      └── Hito 16

apps/landing                        →     apps/landing (sin cambios)

packages/shared (26 archivos)      →     packages/core (schemas base)
  ├── schemas.ts (938 líneas)        →      └── Hito 1 (solo session+message)
  ├── tools-catalog.ts               →      └── Hito 11
  ├── ws-messages.ts                 →      └── Hito 5
  ├── models/                        →      └── Hito 10
  ├── plugins/                       →      └── Hito 11
  ├── stores/                        →      └── Hito 3
  ├── tools/                         →      └── Hito 4
  └── attention.ts                   →      └── Hito 8b

packages/spaces-sdk                 →     Hito 15 (reconstruir)

packages/core                       →     packages/core ✓ (Hito 1)
packages/engine                     →     packages/engine ✓ (Hito 2)
packages/providers                  →     packages/providers ✓ (Hito 3)
packages/sandbox                    →     packages/sandbox ✓ (Hito 3)
packages/storage                    →     packages/storage ✓ (Hito 3)
packages/tools                      →     packages/tools ✓ (Hito 4)

◎ = cubierto    ❌ = excluido explícitamente    ✓ = migrado en ese hito
```

---

_Reporte generado a partir del análisis de ~68 archivos del servidor, ~170 archivos del cliente, y las 3 fuentes de planificación (about.md, PLAN.md, 15-core-architecture-migration.md)._
