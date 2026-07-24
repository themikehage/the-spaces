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
- [ ] Definir comandos estándar para typecheck, lint y pruebas en todos los workspaces.
- [ ] Añadir pruebas de integración para rutas críticas: autenticación, sesiones, archivos y WebSocket.
- [ ] Ampliar las pruebas de la orquestación de agentes, equipos y aprobaciones.
- [ ] Eliminar los usos restantes de `any` y reforzar los contratos de API.
- [x] Sustituir enlaces locales fijos de la landing por configuración de entorno o rutas de despliegue.
- [ ] Documentar variables de entorno, persistencia local y procedimiento de despliegue.

## Criterio de cierre del sprint

- La compilación, typecheck, lint y pruebas pasan de forma reproducible.
- Las rutas y flujos críticos cuentan con pruebas de integración.
- La documentación permite instalar, configurar y ejecutar el producto sin conocimiento previo del repositorio.
