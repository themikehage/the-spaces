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
