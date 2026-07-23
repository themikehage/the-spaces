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
- Orquestación de agentes y equipos mediante la herramienta unificada `manage_delegations` que maneja subagentes aislados (`spawn`) y derivaciones (`delegate`), con control de cancelación (abort) desde UI y flujo de actividad en tiempo real.
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
