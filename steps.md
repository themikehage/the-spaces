# Steps - Project Tasks

## Base de producto completada

- [x] Configurar el monorepo y los workspaces de `pnpm`.
- [x] Crear el paquete compartido con contratos, tipos y esquemas Zod.
- [x] Implementar el servidor Bun + Hono, API REST, autenticación y WebSocket.
- [x] Implementar el cliente React para proyectos, sesiones, agentes, equipos y workspace.
- [x] Implementar la landing de producto.
- [x] Incorporar gestión de archivos, preview, logs, backups, proveedores, skills, MCP, plugins y aprobaciones.
- [x] Integrar 9 proveedores de IA: OpenAI, Google Gemini, xAI, DeepSeek, Groq, Mistral, OpenRouter, Qwen y OpenCodeGo.
- [x] Implementar herramientas de generación de imágenes y video.
- [x] Unificar orquestación de subagentes en `manage_delegations` (spawn + delegate).
- [x] Implementar motor de permisos dinámico por usuario/sesión.
- [x] Añadir herramientas de preview en vivo para proyectos HTML.
- [x] Integrar formateo Markdown en mensajes del chat.
- [x] Refactorizar tema visual con modo claro/oscuro completo.

## Estabilización y calidad

- [x] Actualizar la documentación de producto y del estado real del repositorio.
- [x] Ejecutar y registrar una verificación completa de `pnpm build`.
- [x] Implementar desacoplamiento de Core SDK (Fases 0, 1 y 2: contratos, puertos, resolución de modelo, config por workspace `.spaces/config.json` y payloads de delegación `outputs`).
- [x] Resolver items críticos de `03-core-sdk-next-steps.md`: desacoplar `SessionPromptBuilder` y `DelegationRegistry` de `sessionManager`, estandarizar `ToolActivationEngine` con políticas por workspace, categorizar `TOOL_GROUPS`, habilitar inyección de memoria auto-recalled y asegurar trazabilidad de tools no instaladas (`manage_pipelines`).
- [x] Implementar la Fase 1 del Plan 04 (`04-post-next-steps.md`): estructurar la Arquitectura Limpia interna en `apps/server/src/core/ports/` e implementar el contrato de integración `SpacesHost`.
- [x] Implementar la sección de Observabilidad real del Plan 04: registro de auditoría estructurado en JSONL (`tool-calls.jsonl`) vía `afterToolCall` hook, agregación de métricas en `ObservabilityService` y endpoints REST `/api/logs/tool-calls` y `/api/logs/metrics`.
- [x] Completar Refactorización para Código Abierto (Open Source Readiness):
  - Fase 0: Auditoría, eliminación de código muerto (channel/lab), definición de `TOOL_GROUPS`, hooks `afterToolCall` y `buildProjectContextPrompt()`.
  - Fase 1: Desacoplamiento de singletons (`DelegationRegistry` orientado a eventos con `onEvent`, `SessionToolFactory` con inyección estática, `ManageDelegationsTool` con inyección de puertos).
  - Fase 2: Unificación de runtimes con `createAgentRuntime(config)` y `resolveAgentContext()`, simplificando `createAgentServer()` y `sessionManager`.
  - Fase 3: Formalización del contrato `SpacesHost` (`ServerSpacesHost`) y creación de `ARCHITECTURE.md`.
- [x] Implementar el Plan 07 de Calidad de Código (`plans/07-code-quality.md`):
  - Fase 1 (Tooling): `.editorconfig`, `.prettierrc`, `.prettierignore`, `eslint.config.mjs` (v9 flat config), `lefthook.yml` y scripts unificados de formateo/linting en `package.json`.
  - Fase 2 (Errores): Jerarquía centralizada de clases `AppError`, `HttpError`, middleware de `X-Request-Id` e integración global de `onError` en Hono con serialización segura. Refactorizado de `routes/auth.ts`.
  - Fase 3 (Strict TS): Tipado de `bash-tool.ts`, `approval-manager.ts` y eliminación progresiva de `any`.
  - Fase 5 (Docs): Configuración de `typedoc.json` para generación automática de documentación de contratos y API.
- [x] Implementar la sección de Observabilidad real del Plan 04: registro de auditoría estructurado en JSONL (`tool-calls.jsonl`) vía `afterToolCall` hook, agregación de métricas en `ObservabilityService` y endpoints REST `/api/logs/tool-calls` y `/api/logs/metrics`.
- [x] Completar Refactorización para Código Abierto (Open Source Readiness):
  - Fase 0: Auditoría, eliminación de código muerto (channel/lab), definición de `TOOL_GROUPS`, hooks `afterToolCall` y `buildProjectContextPrompt()`.
  - Fase 1: Desacoplamiento de singletons (`DelegationRegistry` orientado a eventos con `onEvent`, `SessionToolFactory` con inyección estática, `ManageDelegationsTool` con inyección de puertos).
  - Fase 2: Unificación de runtimes con `createAgentRuntime(config)` y `resolveAgentContext()`, simplificando `createAgentServer()` y `sessionManager`.
  - Fase 3: Formalización del contrato `SpacesHost` (`ServerSpacesHost`) y creación de `ARCHITECTURE.md`.
- [x] Implementar el Plan 07 de Calidad de Código (`plans/07-code-quality.md`):
  - Fase 1 (Tooling): `.editorconfig`, `.prettierrc`, `.prettierignore`, `eslint.config.mjs` (v9 flat config), `lefthook.yml` y scripts unificados de formateo/linting en `package.json`.
  - Fase 2 (Errores): Jerarquía centralizada de clases `AppError`, `HttpError`, middleware de `X-Request-Id` e integración global de `onError` en Hono con serialización segura. Refactorizado de `routes/auth.ts`.
  - Fase 3 (Strict TS): Tipado de `bash-tool.ts`, `approval-manager.ts` y eliminación progresiva de `any`.
  - Fase 5 (Docs): Configuración de `typedoc.json` para generación automática de documentación de contratos y API.
- [x] Implementar el Plan 08 de Security Hardening (`plans/08-security.md`):
  - Área 1 (Secrets): Eliminación de fallback de cifrado hardcodeado en `env-crypto.ts` y logs de diagnóstico con fragmentos de secretos en `settings.ts`.
  - Área 2 (Secret Scanning): Configuración de `secretlint`, `.secretlintrc.json`, script `secret-scan`, hook `lefthook` y GitHub Actions CI.
  - Área 3 (Auth Security): Cabeceras HTTP de seguridad (`security-headers.ts`), Rate limiting por IP en auth y API (`rate-limiter.ts`), CORS restrictivo con `ALLOWED_ORIGINS`, desactivación de `?token=` en query string.
  - Área 4 (Bash Sandbox): Rutas restringidas de sistema (`restricted-paths.ts`), límite de salida de 50KB, timeout de 30s y audit logger (`[BASH_AUDIT]`).
  - Área 5 (Circuit Breaker): Patrón `CircuitBreaker` (`circuit-breaker.ts`) integrado en `model-registry.ts` para proteger peticiones a servicios AI externos.
- [x] Implementar el Plan 09 de Extensibilidad de Arquitectura (`plans/09-architecture-extensibility.md`):
  - Área 1 (Service Abstraction): Definición de `ISessionStore`, `IArtifactStore` e `IMemoryStore` en `@shared`, e implementación de `FileSessionStore`, `FileArtifactStore`, `MemorySessionStore` y `MemoryArtifactStore`. Integración en `SpacesHost`.
  - Área 2 (Tool Abstraction): Definición de `BaseTool`, `FunctionTool`, `ToolRegistry` y `legacyToolToBaseTool` adapter. Tipado de `customTools` como `BaseTool[]` en `AgentRuntimeConfig`.
  - Área 3 (Model Providers): Definición de `BaseLlmProvider`, `LLMRegistry` y `ModelEnrichmentService`. Implementación de `registerAllProviders` orchestrator.
  - Área 4 (Plugin System): Definición de `BasePlugin` y `PluginManager`. Implementación de `AuditLogPlugin`, `WsNotifyPlugin` y `MemoryEnricherPlugin`. Integración en `createAgentRuntime`.
  - Área 5 (SDK Packaging): Creación del paquete de espacio de trabajo `packages/spaces-sdk` re-exportando la superficie pública de extensibilidad.
- [x] Implementar el Plan 10 de Deuda Técnica Estructural (`plans/10-technical-debt.md`):
  - [x] Fase A - Área 3: Dual SessionManager Rename (`SessionManager` en `session-persistence.ts` -> `JsonlSessionStore`).
  - [x] Fase A - Área 1: Singleton Hell -> Dependency Injection (`ServerContext`, constructor injection, interfaces de puertos).
  - [x] Fase A - Área 2: God Object AgentSession -> Decomposición (EventBus, ToolRegistry, SkillLoader, PromptBuilder, ContextEstimator, CompactionManager, NavigationController).
  - [x] Fase B - Área 5: WebSocket Typed Contract (`ws-messages.ts` Zod schemas + factory refactor).
  - [x] Corregir regresión de metadatos de contexto (projectId, agentId, teamId) en la creación de sesiones (`POST /api/sessions`).
- [x] Desacoplar `ask_question` de las modales globales de aprobaciones e implementar el **Attention Hub** (centro de atención en la TopBar con popover y navegación a sesiones).
- [x] Auditoría y saneamiento del módulo de delegaciones: eliminación de acoplamiento a singletons en `manage_delegations` y rutas REST, protección contra bucles infinitos en `getSubagentDepth`, sincronización WS de delegaciones interrumpidas y corrección del typecheck de TypeScript en `apps/server`.
- [x] Implementar Hito 01 de Pre-OSS Stabilization (`plans/11-pre-oss-stabilization/01-session-create-semantics.md`): Restaurar la semántica completa de `POST /api/sessions` (Orchestration-Only), extraer el helper `createUserSession`, eliminar handlers sombra legacy y remover referencias a `Negotiation`.
- [x] Implementar Hito 05 de Pre-OSS Stabilization (`plans/11-pre-oss-stabilization/05-runtime-tool-catalog.md`): Unificar el catálogo de herramientas en `packages/shared/src/tools-catalog.ts`, refactorizar los perfiles de inicio mediante `bootstrapAgentSession`, consolidar la política de memoria y eliminar arrays hardcodeados locales de tools.
- [x] Implementar la configuración "Show System Prompts" (Inspector de Prompts del Sistema): Motor dry-run en `SessionPromptBuilder.previewSystemPrompt`, endpoint `POST /api/prompts/preview`, switch de usuario `showPromptPreviews` y componente UI `<SystemPromptViewer />` inyectado en ajustes de Agente Global, Agentes, Sub-agentes, Repositorios y Equipos.
- [x] Implementar Hito 12 — Entity Config Cascade (`CascadeConfigLoader`): Abstracción `EntityConfig`, `deepMerge` con deduplicación y overrides, resolución en cascada `global -> entity (team > project > agent)`, wiring en runtimes (`DefaultModelResolver`, `ToolActivationEngine`, `PermissionEngine`), sub-router REST `/api/config` y endpoint de conveniencia `GET /api/sessions/:id/config`.
- [x] Implementar Interfaz UI de Configuración por Entidad: Componente reutilizable `EntityConfigEditor`, hook de React `useEntityConfig`, indicadores visuales de herencia/override e integración completa en paneles de Ajustes Globales (`GeneralTab`), Proyectos (`ProjectSettingsModal`), Agentes (`RegisterModal`) y Equipos (`TeamDetailPage`). Verificación completa de cero regresiones.
- [x] Implementar Plan 13 — Agent SDK Abstraction: `SpacesAgent` declarativo, `SpacesRunner` standalone, esquema `SpacesAgentConfigSchema`, re-exportación pública de contratos en `spaces-sdk` y factorías de herramientas built-in (`createBashTool`, `createReadTool`, `createWriteTool`, etc.) con suite de pruebas unitarias (`spaces-agent.test.ts`).
- [x] Implementar Plan 14 — Session Creation Entity Config & Welcome Input Selectors: Extensión de `CreateSessionSchema` para aceptar tools, skills y executionMode iniciales; resolución e inyección de skills, rules y workflows de `entityConfig` en `agent-context-resolver.ts` y `SessionPromptBuilder`; persistencia inmediata en `createUserSession`; y selectores de tools y skills pre-poblados dinámicamente en `WelcomeChatInput` con propagación end-to-end.
- [x] Implementar Plan 15 — Entity Skills Configuration & Management: Extensión de `GET /api/skills` con parámetros `entityType` y `entityId`, hook de React `useEntitySkills`, componente `EntitySkillsEditor` reutilizable con inspección de `SKILL.md` y switches de toggle, e integración completa en paneles de configuración de Agente Global, Agentes, Equipos y Proyectos.
- [x] Implementar Feature de Schedules (Tareas Programadas MVP): Esquemas Zod en `packages/shared`, persistencia SQLite en `schedules.db`, `ScheduleService` y `ScheduleRunner` in-process (`croner`), sub-router REST `/api/schedules`, hook React `useSchedules`, diálogo modal `ScheduleJobDialog`, panel de historial `ScheduleRunHistory`, vista `SchedulesPage` y suite de pruebas unitarias (`schedules.test.ts`).
- [x] Eliminar barra superior de título de chats en `ChatArea` y trasladar el título activo de la sesión y la navegación de sub-sesiones a los `Breadcrumbs` de `MainLayout`.
- [x] Implementar Plan 16 — Custom Tools Entity-Scoped (Add, Activate, Deactivate): Tipos compartidos (`ToolScopeTarget`, `PatchScopeToolsSchema`, etc.), `ScopeConfig` extendido con `teams` y migración a `agentTools` sustractivo `{add, remove}`, cadena de resolución `global -> team -> project -> agent(add/remove)`, `GET /api/custom-tools`, `GET /api/agents/scope/tools`, broadcast WS en mutaciones, hook `useEntityCustomTools`, componente `EntityCustomToolsEditor` e integración completa en paneles de Ajustes Globales, Agentes, Proyectos y Equipos.
- [x] Implementar Hito 1 de Desacoplamiento de Arquitectura (Plan 17): Definición de puertos Core en `core/ports/` (`IAgentRuntime`, `IToolExecutor`, `IToolRegistry`, `IHookRunner`, `IPermissionEngine`, `IEventBus`), `TypedEventEmitter`, `ToolExecutor` y adaptador `AgentRuntime` con suites de pruebas unitarias.
- [x] Implementar Hito 2 de Desacoplamiento de Arquitectura (Plan 18): Integración de `IAgentRuntime` en `SessionManager`, compatibilidad en adaptadores de eventos y refactorización de consumidores en rutas REST, WebSocket handlers y delegación con suite de pruebas unitarias (`session-manager-runtime.test.ts`).
- [x] Implementar Hito 3 de Desacoplamiento de Arquitectura (Plan 19): Modularización de Herramientas del Sistema (`ITool`). Creación de clases puras e independientes `ReadTool`, `WriteTool`, `EditTool`, `GrepTool`, `FindTool`, `LsTool` y `BashTool` con esquemas tipados, adaptadores de compatibilidad retrocompatible y suite de pruebas unitarias (`system-tools.test.ts`).
- [x] Implementar Hito 4 de Desacoplamiento de Arquitectura (Plan 20): Persistencia Limpia `FilesystemSessionStore` (`ISessionStore`). Implementación completa y thread-safe de la interfaz `ISessionStore` para lectura/escritura JSONL (`messages.jsonl`) y metadatos (`metadata.json`), paginación, filtros de búsqueda, adaptadores e inyección en `AgentRuntime` y suite de pruebas unitarias (`filesystem-session-store.test.ts`).
- [x] Implementar Hito 5 de Desacoplamiento de Arquitectura (Plan 21): Proveedor de Modelo Unificado `OpenAICompatibleProvider` (`IModelProvider`). Implementación desacoplada y nativa con `fetch` y streaming SSE para endpoints `/v1/chat/completions`, ensamblado de llamadas a herramientas fragmentadas, deltas de razonamiento, adaptador `ModelProviderAdapter`, inyección en `AgentRuntime` y suite de pruebas unitarias (`openai-compatible-provider.test.ts`).
- [x] Eliminar el sistema de plugins, mover ajustes de UI a la configuración (Memory & Exa Search integrados en Settings > General, remoción de PluginsPage, ruta `/plugins` y código durmiente PluginManager/BasePlugin).
- [x] Unificar herramientas de tareas en `task.tool` (acciones start/update/end/status), unificar herramientas de memoria en `memory.tool` (acciones read/upsert/delete) y eliminar código muerto de `manage_pipelines` y sus referencias.

## Arquitectura del frontend

- [x] Implementar Hito 1 — Capa de Servicios de API del Cliente (`plans/completed/22-frontend-api-service-layer.md`):
  - [x] Fase 1: Crear `lib/api/agents.service.ts`, `lib/api/teams.service.ts` y migrar `useAgents.ts`, `useTeams.ts`, `useTeam.ts`
  - [x] Fase 2: Crear `lib/api/config.service.ts`, `lib/api/skills.service.ts`, `lib/api/custom-tools.service.ts`, `lib/api/schedules.service.ts` y migrar hooks de entidad
  - [x] Fase 3: Crear `lib/api/sessions.service.ts`, `lib/api/auth.service.ts` y migrar `SessionsContext`, `useSessionResolver`, `AuthContext`
  - [x] Fase 4: Crear `lib/api/projects.service.ts`, `lib/api/env.service.ts`, `lib/api/settings.service.ts`, `lib/api/mcp.service.ts`, `lib/api/workspace.service.ts` y barrel export en `lib/api/index.ts`
  - [x] Auditoría final: `pnpm --filter client run typecheck` y `pnpm build` pasan limpiamente con 0 errores.
- [x] Implementar Hito 2 — Descomposición de Componentes (`plans/23-frontend-component-decomposition.md`):
  - [x] Fase 1: Descomponer GeneralTab (1193→101), ToolCallRow (1117→211), ChatArea (927→108), MessageList (852→124), MainLayout (802→359)
  - [x] Fase 2: Descomponer ChatInput (660→312), SessionSidebar (541→306), ProjectFloorPanel (520→≤500)
  - [x] Fase 3: Auditar y reducir componentes en 400-500 líneas
  - [x] Fase 4: Descomponer AgentsPage (1149→328), DashboardPage (735→333), MCPMarketplacePage (700→334), AnalyticsPage (519→330)
- [x] Implementar Hito 3 — Eliminación de Duplicaciones (`plans/24-frontend-deduplication.md`):
  - [x] Fase 1: Sistema de modales unificado (`Dialog`, `FormDialog`) y migración de los 9 modales
  - [x] Fase 2: Hook de upload/delete de avatar (`useAvatarUpload`)
  - [x] Fase 3: EventBus centralizado (`EntityEventBus`) tipado para `entity-updated` (30 emisores + 9 listeners migrados)
  - [x] Fase 4: Servicio de `localStorage` tipado (`storage`) + hook reactivo `useLocalStorage`
  - [x] Fase 5: Primitivas de formulario reutilizables (`FormField`, `FormSection`)
  - [x] Fase 6: Hooks de eventos (`useEscapeKey`, `useClickOutside`)
  - [x] Verificación: `pnpm --filter client run typecheck` y `pnpm --filter client run build` exitosos con 0 errores.
- [x] Implementar las 5 Mejoras Principales de Robustez del Editor de Workflows:
  - [x] Feature 1: Nodos de Control de Flujo (`if`, `switch`, `merge`) con podado dinámico de ramas.
  - [x] Feature 2: Expression Engine & JSONata con scope `$inputs`, `$steps`, `$run` y soporte de interpolación.
  - [x] Feature 3: Human-in-the-Loop Node (Pausa por Aprobación) con UI Banner, eventos WS y endpoints REST.
  - [x] Feature 4: Data Pinning & Step Dry-Run para testing determinista sin consumo redundante de LLM.
  - [x] Feature 5: Code Node con ejecución de snippets JS en sandbox aislado (`isolated-vm` + V8 Isolate).
  - [x] Feature 6: Herramienta `manage_workflow` (Single Tool Pattern) para el Agente Global con contrato declarativo (`action: "contract"`), operaciones CRUD, control granular de nodos y ramas, control de ejecuciones (`run`, `get_run`, `abort`, `approve`), catálogo unificado y guía `.agents/rules/workflow.rules.md`.
  - [x] Suite de pruebas unitarias (`workflow-features.test.ts`) y verificación completa de `pnpm build`.

- [x] Implementar el Plan Profesional de Mejoras Post-Auditoría del Motor de Workflows:
  - [x] WF-01: `$inputs` dinámicos al ejecutar (`run` acepta `inputs` parametrizables inyectados en `$inputs`).
  - [x] WF-02: Fix `captureOutputs` en paso `agent` (extracción resiliente de claves mapeadas desde envelope y outputs).
  - [x] WF-03: Historial de runs con filtros en SQLite `workflows.db` (`IWorkflowRunStore` / `SqliteWorkflowRunStore` + `GET /api/workflows/runs` + `manage_workflow(action:"list_runs", status, limit)`).
  - [x] WF-04: Hardening de timeouts, retry y `errorBranch` con suite de pruebas de integración.
  - [x] WF-05: Notificaciones de fallo de workflow (`onFailure` con webhook POST y alértas `attention_item_created` en Attention Hub).
  - [x] WF-06: Cron Scheduler para Workflows (`schedule` cron expression auto-sincronizada en `WorkflowScheduler` usando `croner`).
  - [x] WF-07: Paso `delay` / sleep (pausa configurable de 1ms a 15 min `durationMs` en `executeDelayStep`).
  - [x] WF-08: Paso Sub-Workflow (`type:"workflow"`) para modularización con `subWorkflowId`, passing de inputs y protección anti-recursión (`maxDepth: 3`).
  - [x] Actualizar esquemas Zod en `@shared`, contrato `manage_workflow`, documentación `.agents/rules/workflow.rules.md` y suite de pruebas `workflow-engine-enhancements.test.ts`.
- [x] Modificaciones en la Tool de Task: UI no bloqueante durante la ejecución de planes y botón de cancelación total en la barra flotante `FloatingTasks`.
- [x] Implementar el Plan 31 — Diagnóstico y Fix de Desincronización de UI en Sesiones Largas (`plans/completed/31-ui-desync-long-sessions.md`):
  - [x] Limpieza real y des-suscripción de listeners de WebSocket en el servidor (`wsRegistry.clearUnsub` / `setUnsub`).
  - [x] Emisión de eventos no bloqueante con `Promise.allSettled` en `TypedEventEmitter.emit`.
  - [x] Cleanup reactivo de suscripción en `useConnectionAwareEffect` enviando `session_unsubscribe` al cliente.
  - [x] Sincronización dinámica del flag `streaming` en `useChatAreaState.ts` escuchando el evento `session_status`.
- [x] Implementar el Plan 36 — Campo `tag` en entidades (`plans/36-entities-tag.md`):
  - [x] Definición de `tag: z.string().max(64).optional()` en esquemas compartidos (`AgentDefinitionSchema`, `TeamSchema`, `CreateTeamSchema`, `ProjectSchema`, `WorkflowDefinitionSchema`).
  - [x] Soporte de persistencia en servidor (`agent-registry.ts`, `team-store.ts`, `files.ts`, `workflow-store.ts`).
  - [x] Propagación en servicios API del cliente (`agents`, `teams`, `projects`, `workflows`).
  - [x] Campos de entrada opcionales `tag` en los formularios modales (`RegisterModal`, `TeamCreateModal`, `TeamSettingsModal`, `DashboardModals`, `WorkflowsListPage`).
  - [x] Renderizado del chip de `tag` en las tarjetas y componentes de UI (`AgentCard`, `TeamCard`, etc.).
- [x] Implementar Hito 0 — Mobile Scaffolding & Fundación Flutter (`plans/mobile-00-scaffolding.md`):
  - [x] Crear estructura base en `apps/mobile/` (`lib/core/`, `lib/features/`, `lib/shared/`).
  - [x] Implementar `ApiClient` tipado con interceptores de autenticación y mapeo jerárquico de excepciones `ApiException`.
  - [x] Implementar `WsClient` resiliente con reconexión automática y backoff exponencial.
  - [x] Implementar `AppStorage` tipado con `FlutterSecureStorage` y `SharedPreferences`.
  - [x] Centralizar tokens de diseño en `AppTheme`, `AppColors`, `AppTypography` y `AppSpacing` mapeados desde `index.css`.
  - [x] Implementar script puente `scripts/export-shared-schema.ts` / `scripts/sync-types.sh` y comando `sync-mobile-types`.
  - [x] Verificación completa con `flutter analyze` (0 warnings/errors), 10 unit/smoke tests en verde y build íntegro del monorepo (`pnpm build`).
- [x] Implementar Hito 1 — Mobile Auth & Session Guard (`plans/mobile-01-auth.md`):
  - [x] Implementar modelos `AuthUser` y `AuthResponse` inmutables y tipados.
  - [x] Implementar `AuthRepository` encapsulando `POST /api/auth/login`, `POST /api/auth/logout` y persistencia segura en `AppStorage`.
  - [x] Implementar state machine `AuthState` y `AuthNotifier` desacoplados de widgets y HTTP directo.
  - [x] Implementar UI `LoginScreen` con tokens de `AppTheme`, inputs validados y feedback de error inline.
  - [x] Implementar navegación declarativa con `GoRouter.redirect` y `RouterListenable` reactivo a cambios de sesión.
  - [x] Verificación completa: 28 tests unitarios/widget en verde y `flutter analyze` con 0 warnings/errors.
- [x] Implementar Hito 2 — Mobile Dashboard (`plans/mobile-02-dashboard.md`):
  - [x] Sub-hito 2.1: Modelos de datos `DashboardSession` y `DashboardProject` con Freezed y parsing flexible.
  - [x] Sub-hito 2.2: `DashboardRepository` sobre `ApiClient` (`/api/sessions`, `/api/workspace-projects`) sin `Dio` directo ni referencias a UI.
  - [x] Sub-hito 2.3: State machine `DashboardState` y `DashboardNotifier` con carga paralela, pull-to-refresh y suscripción reactiva a eventos WebSocket `session_status` (< 2s).
  - [x] Sub-hito 2.4: UI `DashboardScreen` (cero `setState`), `SessionCard` con badges semánticos, `ProjectCard`, `DashboardSkeleton` animado y rutas conectadas en `AppRouter`.
  - [x] Verificación completa: 15 tests dedicados del feature en verde (43 tests totales en mobile) y `flutter analyze` con 0 issues.

## Próximos pasos

- [ ] Implementar el Plan 40 — Arquitectura de Sandboxing Productivo (`plans/40-production-sandbox-architecture.md`).



