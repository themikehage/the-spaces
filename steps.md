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
- [ ] (Pospuesto por solicitud del usuario) Añadir pruebas de integración para rutas críticas (autenticación, sesiones, archivos, WebSocket) y orquestación.

## Criterio de cierre del sprint

- La compilación, typecheck, lint y pruebas pasan de forma reproducible.
- Las rutas y flujos críticos cuentan con pruebas de integración.
- La documentación permite instalar, configurar y ejecutar el producto sin conocimiento previo del repositorio.
