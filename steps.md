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

## Próximo sprint: estabilización y calidad

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

## Próximo sprint: estabilización y calidad

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

## Criterio de cierre del sprint

- La compilación, typecheck, lint y pruebas pasan de forma reproducible.
- Las rutas y flujos críticos cuentan con pruebas de integración.
- La documentación permite instalar, configurar y ejecutar el producto sin conocimiento previo del repositorio.
