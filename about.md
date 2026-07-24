# About - Spaces

Spaces es un espacio de trabajo en la nube para coordinar proyectos asistidos por agentes de IA. Cada proyecto reúne sesiones, archivos, agentes, equipos, configuración de modelos, herramientas MCP y un entorno de ejecución/preview.

## Arquitectura

El repositorio es un monorepo con workspaces de `pnpm`:

- **`apps/client`**: aplicación principal en React 19, Vite, TypeScript y Tailwind CSS v4. Incluye un dashboard operativo que prioriza sesiones activas y proyectos recientes, además de chat, agentes, equipos, delegaciones, workspace de archivos, preview, timeline, logs, plugins, skills y ajustes.
- **`apps/landing`**: landing de producto en React, Vite y Tailwind CSS v4, rediseñada como una sala de control editorial que explica el flujo de delegación, ejecución y aprobación entre personas y agentes.
- **`apps/server`**: servidor Bun + Hono. Expone API REST, autenticación, WebSocket y los servicios de ejecución del producto.
- **`packages/shared`**: contratos, esquemas Zod, tipos y utilidades compartidos entre aplicaciones.

## Capacidades principales

- Gestión de proyectos, sesiones, archivos y workspaces.
- Core SDK desacoplado en capas de contratos: `WorkspaceConfigPort` (para `.spaces/config.json` por workspace), `ModelResolver` (cascada de resolución de modelo por entidad), `ToolActivationEngine` basado en políticas (`toolOverrides` add/remove y categorización `TOOL_GROUPS`), inyección de contexto de memoria auto-recalled, hooks `afterToolCall` y motor unificado de instanciación de runtimes `createAgentRuntime(config)`.
- Orquestación de agentes y equipos mediante la herramienta unificada `manage_delegations` y el registro de delegaciones orientado a eventos `DelegationRegistry.onEvent(...)`, desvinculado de dependencias circulares con WebSocket, que maneja subagentes aislados (`spawn`) y derivaciones (`delegate`), con control de cancelación (abort) desde UI y flujo de actividad en tiempo real.
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
- Comunicación en tiempo real mediante WebSocket en `/ws`.

## Backend

El punto de entrada está en `apps/server/src/index.ts`. Las rutas se agrupan bajo `/api`:

- `auth` — login y autenticación
- `sessions` — CRUD de sesiones y chat streaming
- `agents`, `teams` — CRUD de agentes y equipos
- `files` — subida y gestión de archivos
- `models`, `providers` — catálogo de modelos y configuración de proveedores
- `settings`, `env` — ajustes de usuario y variables de entorno
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
