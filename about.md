# About - Spaces

Spaces es un espacio de trabajo en la nube para coordinar proyectos asistidos por agentes de IA. Cada proyecto reúne sesiones, archivos, agentes, equipos, configuración de modelos, herramientas MCP y un entorno de ejecución/preview.

## Arquitectura

El repositorio es un monorepo con workspaces de `pnpm`:

- **`apps/client`**: aplicación principal en React 19, Vite, TypeScript y Tailwind CSS v4. Incluye un dashboard operativo que prioriza sesiones activas y proyectos recientes, además de chat, agentes, equipos, delegaciones, workspace de archivos, preview, timeline, logs, plugins, skills y ajustes.
- **`apps/landing`**: landing de producto en React, Vite y Tailwind CSS v4, rediseñada como una sala de control editorial que explica el flujo de delegación, ejecución y aprobación entre personas y agentes.
- **`apps/server`**: servidor Bun + Hono. Expone API REST, autenticación, WebSocket y los servicios de ejecución del producto.
- **`packages/core`**: fuente única de verdad para contratos, interfaces puras (ports), tipos y schemas Zod sin implementaciones ni dependencias externas salvo Zod.
- **`packages/engine`**: `AgentRuntime` decoupled engine que compone dependencias inyectadas (`IModelProvider`, `ISessionStore`, `IToolExecutor`, `IPromptBuilder`, `IHookRunner`, `IPermissionEngine`).
- **`packages/providers`**, **`packages/storage`**, **`packages/sandbox`**, **`packages/tools`**: implementaciones aisladas de proveedores, persistencia JSONL en filesystem, sandbox local y catálogo ITool.
- **`packages/spaces-sdk`**: paquete de espacio de trabajo que re-exporta la superficie pública de extensibilidad desde `@spaces/core` y `@spaces/engine`.

## Capacidades principales

- Gestión de proyectos, sesiones, archivos y workspaces.
- Centro de Atención (Attention Hub) en la TopBar con popover y badges de notificación para navegación directa a sesiones con preguntas o aprobaciones pendientes. Persistencia completa de metadatos de contexto (`projectId`, `agentId`, `teamId`) al crear sesiones. Desacoplamiento de `ask_question` para renderizado puramente inline en el chat.
- Integración de títulos de sesión en Breadcrumbs: Eliminación del header interno redundante en `ChatArea` para maximizar la superficie vertical del chat, y migración del título de sesión activo y de la navegación hacia sesiones padre a la barra global de navegación en `Breadcrumbs` (`MainLayout`).
- Sistema de Schedules (Tareas Programadas MVP): Automatización de ejecuciones periódicas de asistentes AI mediante intervalos fijos o expresiones cron (`croner`), con persistencia SQLite aislada (`schedules.db`), ejecución in-process desacoplada sin dependencias externas, scopes configurables (`Global`, `Project`, `Agent`, `Team`), recuperabilidad ante caídas de servidor y vista principal `SchedulesPage` con historial detallado de ejecuciones y respuestas.
- Unificación del Catálogo de Tools y Runtime Session Bootstrap (Hito 05 de Pre-OSS Stabilization): Consolidación del catálogo SSOT de herramientas en `packages/shared/src/tools-catalog.ts` (`AVAILABLE_TOOLS`, `TOOL_GROUPS` con keys lowercase estables, `DEFAULT_ALWAYS_ON_TOOLS`), creación del orquestador `bootstrapAgentSession` para unificar la activación de herramientas, la política única de enriquecimiento de memoria y el adjuntado de MCP a través de los perfiles (`user-session`, `agent-server`, `subagent`, `delegate`), y eliminación de arreglos de herramientas hardcodeados locales en servidor y WebSocket.
- Refactorización de Deuda Técnica Estructural (Plan 10): Desambiguación de persisencia `JsonlSessionStore` (anteriormente `SessionManager` duplicado en `session-persistence.ts`), Inyección de Dependencias centralizada mediante `ServerContext` (`createServerContext()`) e interfaces de puerto (`ISessionManager`, `IMcpRegistry`, `IDelegationRegistry`, `IMemoryRegistry`, `IUiApprovalRegistry`), Decomposición del God Object `AgentSession` en 7 submódulos dedicados (`TypedEventEmitter`, `ToolRegistry`, `SkillLoader`, `PromptBuilder`, `ContextEstimator`, `CompactionManager` y `NavigationController`), Especificación de contrato tipado de WebSocket (`ws-messages.ts` con Zod schemas y especificación `docs/websocket-protocol.md`) y Modularización del Router de Sesiones (`routes/sessions/index.ts` y `session-crud.ts`).
- Extensibilidad de Arquitectura (Plan 09): Abstracción de Servicios (`ISessionStore`, `IArtifactStore`, `IMemoryStore` con implementaciones `File*Store` y `Memory*Store`), Abstracción de Herramientas (`BaseTool`, `FunctionTool`, `ToolRegistry` con namespaces y `legacyToolToBaseTool` adapter), Abstracción de Proveedores de Modelo (`BaseLlmProvider`, `LLMRegistry` y `ModelEnrichmentService`), Sistema de Plugins (`BasePlugin` y `PluginManager` con plugins `AuditLogPlugin`, `WsNotifyPlugin` y `MemoryEnricherPlugin`), y Empaquetado SDK interno `packages/spaces-sdk`.
- Core SDK desacoplado en capas de contratos: `WorkspaceConfigPort` (para `.spaces/config.json` por workspace), `CascadeConfigLoader` para resolución en cascada (`global -> entity`), `EntityConfig` (modelos, `toolOverrides` add/remove, `permissionOverrides`, `skills`, `rules`, `workflows`, `hooks`), `ModelResolver` (cascada de resolución de modelo por entidad), `ToolActivationEngine` basado en políticas (`toolOverrides` add/remove y categorización `TOOL_GROUPS`), inyección de contexto de memoria auto-recalled, hooks `afterToolCall` y motor unificado de instanciación de runtimes `createAgentRuntime(config)`.
- Creación de Sesión orientada a Entity Config & Selectores de Inicio (Plan 14): Integración de `skills`, `rules` y `workflows` de `EntityConfig` durante la creación de sesiones y armado del system prompt (`SessionPromptBuilder`), extensión de `CreateSessionSchema` y `createUserSession` para recibir selecciones iniciales, e integración en `WelcomeChatInput` de selectores emergentes para tools y skills pre-poblados dinámicamente desde `resolvedConfig`.
- Gestión y Configuración de Custom Tools por Entidad (Plan 16): Adición, activación y desactivación sustractiva (`{ add, remove }`) de custom tools a nivel Global, Equipo, Proyecto y Agente. Cadena de resolución en cascada `global -> team -> project -> agent`, sincronización en tiempo real con sesiones activas vía broadcast WebSocket (`custom_tool_scope`), endpoints `GET /api/custom-tools` y `GET /api/agents/scope/tools`, hook `useEntityCustomTools` y componente reutilizable `EntityCustomToolsEditor` integrado en Ajustes Globales, Agentes, Proyectos y Equipos.
- Gestión y Configuración de Skills por Entidad (Plan 15): Extensión de `GET /api/skills` con resolución por `entityType` y `entityId`, hook `useEntitySkills`, componente UI reutilizable `EntitySkillsEditor` con modal de vista previa de `SKILL.md` e integración completa en paneles de configuración de Agente Global, Agentes, Equipos y Proyectos.
- Router REST de Configuración por Entidad `/api/config` (GET, PUT, `/resolved`) y endpoint `GET /api/sessions/:id/config`, integrado en el cliente mediante el hook `useEntityConfig` y el componente reutilizable `EntityConfigEditor` presente en Ajustes Globales, Proyectos, Agentes y Equipos.
- Orquestación de agentes y equipos mediante la herramienta unificada `manage_delegations` y el registro de delegaciones orientado a eventos `DelegationRegistry.onEvent(...)`, desvinculado de dependencias circulares con WebSocket, que maneja subagentes aislados (`spawn`) y derivaciones (`delegate`), con control de cancelación (abort) desde UI y flujo de actividad en tiempo real.
- Abstracción ADK-Level (`SpacesAgent` + `SpacesRunner`): Capa declarativa pública del Agent Runtime que permite instanciar agentes de forma portable (`new SpacesAgent({ name, model, instruction, tools })`) y ejecutarlos de forma standalone con `new SpacesRunner(agent)` sin requerir acoplamiento a HTTP ni WebSocket, con soporte de streaming (`runner.stream()`) y factorías de herramientas built-in (`createBashTool`, `createReadTool`, `createWriteTool`, etc.).
- Interfaz de integración `SpacesHost` (`ServerSpacesHost`) y documento de arquitectura abierta `ARCHITECTURE.md` para empaquetado y uso del runtime como biblioteca/SDK de código abierto.

- Infraestructura de Calidad de Código (Plan 07): Configuración canónica de ESLint v9 (flat config), Prettier con ordenamiento automático de imports, Lefthook git hooks (pre-commit format/lint/typecheck), EditorConfig, jerarquía de errores centralizada `AppError` con middleware de `X-Request-Id` y `onError` en Hono, tipado estricto en TypeScript sin `any`, y TypeDoc (`typedoc.json`) para documentación automatizada del Core y API.
- Infraestructura de Hardening de Seguridad (Plan 08): Eliminación de claves de cifrado hardcodeadas (`env-crypto.ts` exige secretos por entorno), prevención de fugas de credenciales en logs (`settings.ts`), escaneo automatizado de secretos con `secretlint` (`.secretlintrc.json`, pre-commit y CI), cabeceras HTTP de seguridad HSTS/CSP/nosniff (`security-headers.ts`), rate-limiting por IP (`rate-limiter.ts`), CORS restrictivo (`ALLOWED_ORIGINS`), protección de rutas restringidas de sistema en el sandbox bash (`restricted-paths.ts`), límites de salida (50KB) y timeout (30s) con logs de auditoría JSONL (`[BASH_AUDIT]`), y resiliencia de proveedores AI vía Circuit Breaker (`circuit-breaker.ts`).
- Infraestructura para Código Abierto (Open Source): Licencia MIT, comprobación/inyección automatizada de encabezados SPDX (`scripts/check-license.ts`), CI/CD pipeline en GitHub Actions (`ci.yml`, `release.yml`), orquestación monorepo con `turbo.json`, automatización de releases con Changesets, `.env.example` documentado, guía de self-hosting (`docs/self-hosting.md`), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (v2.1), `SECURITY.md`, plantillas de issue/PR en GitHub y endpoint `GET /api/health` enriquecido.
- Catálogo y configuración de 9 proveedores de IA: OpenAI, Google Gemini, xAI/Grok, DeepSeek, Groq, Mistral, OpenRouter, Qwen y OpenCodeGo.
- Motor de permisos dinámico para control granular de herramientas por usuario/sesión.
- Generación de imágenes (`image_gen`) y videos (`generate_video`) con diagnósticos desde settings.
- Previsualización en vivo de proyectos HTML con herramientas nativas (`manage_preview`).
- Integración con skills, plugins y servidores MCP.
- Backups, logs, galería de imágenes generadas y factory de agentes/proyectos/equipos.
- Comunicación en tiempo real mediante WebSocket desacoplado del engine en `/ws` (Plan 16), respaldado por `AppContext` DI container y `createEngineSessionCrudRouter` en `/api/sessions`.

## Backend

El punto de entrada está en `apps/server/src/index.ts`. Las rutas se agrupan bajo `/api`:

- `auth` — login y autenticación
- `sessions` — CRUD de sesiones y chat streaming
- `agents`, `teams` — CRUD de agentes y equipos
- `files` — subida y gestión de archivos
- `models`, `providers` — catálogo de modelos y configuración de proveedores
- `settings`, `env`, `prompts` — ajustes de usuario, variables de entorno e inspección de prompts del sistema
- `mcp`, `skills` — configuración de servidores MCP y skills personalizadas
- `preview`, `gallery` — previsualización de proyectos y galería de assets generados
- `logs`, `backup` — auditoría y respaldo de datos
- `approvals`, `factory` — flujos de aprobación y factory de entidades

El núcleo del servidor incluye módulos de sesiones, herramientas (14 módulos), proveedores (9 integraciones), prompts, multi-agente, memoria, sandbox de permisos, preview builder/watcher, y registro de delegaciones. Las credenciales de proveedores se cifran antes de persistirse.

## Decisiones técnicas

- **Gestión de paquetes:** `pnpm` workspaces.
- **Runtime y API:** Bun y Hono.
- **Interfaz:** React 19, Vite y Tailwind CSS v4.
- **Contratos y validación:** TypeScript estricto y Zod.
- **Tiempo real:** WebSocket integrado en Bun/Hono.
- **Persistencia:** SQLite local con cifrado de secretos.

## Comandos habituales

- `pnpm dev`: inicia cliente, landing y servidor en paralelo.
- `pnpm build`: compila todos los workspaces.
- `pnpm --filter client run dev`: inicia la aplicación principal.
- `pnpm --filter landing run dev`: inicia la landing.
- `pnpm --filter server run dev`: inicia el servidor en modo desarrollo.
