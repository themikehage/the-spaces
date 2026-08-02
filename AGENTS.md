# AGENTS.md - Spaces

Un espacio de trabajo en la nube para manejar todos tus proyectos con el poder de los agentes de IA

## Mandatory Context Files

Before any work, read: `about.md`, `steps.md`, `AGENTS.md` (this file). These are the single source of truth.

## Workflow

1. Read the 3 MDs above
2. Pick the next incomplete task from `steps.md`
3. Complete the task, validate, and commit
4. Update `steps.md` to mark it completed
5. Update `about.md` after each major change to keep documentation current

## Commands

- `pnpm dev` - Start client, landing, and server in parallel
- `pnpm build` - Build all apps and packages
- `pnpm typecheck` - Run TypeScript typecheck across all workspaces
- `pnpm --filter @spaces/core typecheck` - Typecheck core interfaces package
- `pnpm --filter @spaces/engine typecheck` - Typecheck agent runtime engine package
- `pnpm --filter @spaces/tools typecheck` - Typecheck tools package
- `pnpm --filter @spaces/providers typecheck` - Typecheck LLM model providers package
- `pnpm --filter @spaces/storage typecheck` - Typecheck session storage package
- `pnpm --filter @spaces/sandbox typecheck` - Typecheck sandbox execution package
- `pnpm --filter server run dev` - Run server in watch mode
- `pnpm --filter server run typecheck` - Run TypeScript typecheck on server package
- `pnpm --filter client run dev` - Run client development server

## Architecture & Principles (de `out/auto-browser/PLAN.md`)

1. **Arquitectura Hexagonal & Clean Architecture:** Cero god objects, cero singletons. `AgentRuntime` se compone inyectando dependencias de puertos (`@spaces/core`) vía constructor.
2. **Tipos de Agente como Factories:** Misma clase `AgentRuntime`, distintas dependencias inyectadas por fábrica (`createAgent()`).
3. **Prompt Pipeline por Secciones:** Ensamblado determinista por prioridades (`PromptSection`), sin lógica spaghetti.
4. **Hooks como Middleware Chain:** Cadena `beforePrompt`, `afterPrompt`, `beforeToolCall` (con capability de short-circuit con `null`), `afterToolCall`, `onError`.
5. **Rules Declarativas:** Separadas de hooks (`IPermissionEngine`), evaluadas antes de cada ejecucion de herramientas.
6. **Tool Registry Tipado:** `ITool` con Zod schema obligatorio desde el día 0.
7. **Sandbox e IWorkspace Inyectables:** El runtime nunca ejecuta directamente comandos ni manipula archivos sin abstraer la infraestructura.

## Maintainability & Modularity Directives

- **Single Responsibility & Sub-modules:** Evitar clases o archivos > 300 líneas, clases > 200 líneas.
- **Modular Routing (Sub-router Pattern):** Controladores Hono descompuestos en submódulos (`routes/<domain>/index.ts`).
- **Dependency Injection:** Acceso a servicios centrales vía `AppContext` (`createAppContext()`) y contratos de puertos (`@spaces/core`).
- **Typed Contracts First:** Fuente única de verdad para contratos, puertos y esquemas Zod en `@spaces/core`.
- **Strict Verification:** Ejecutar siempre `pnpm typecheck` y `pnpm build` antes de dar por terminada cualquier tarea.

## Code Conventions

- TypeScript strict mode, cero tipos `any`
- Tailwind CSS v4 únicamente, definir valores en `index.css` via `@theme`
- No comentarios en código de producción
- Imports absolutos: alias `@/` para `client/src/`
- Componentes funcionales con hooks de React

## Stack

- **Backend:** Bun + Hono + Zod + `@spaces/engine`
- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4
- **Packages:**
  - `@spaces/core`: Contratos puramente tipados, interfaces (ports) y Zod schemas. Fuente única de verdad.
  - `@spaces/engine`: Runtime del agente, PromptBuilder, HookRunner, EventBus y PermissionEngine.
  - `@spaces/tools`: Herramientas nativas (`ITool`) con validación Zod y conectores MCP/custom.
  - `@spaces/providers`: Clientes de modelos LLM compatibles con OpenAI SSE streaming.
  - `@spaces/storage`: Adaptadores de almacenamiento (`FilesystemSessionStore`, `MemorySessionStore`).
  - `@spaces/sandbox`: Aislamiento de ejecución en entorno local/restringido (`LocalSandbox`).
  - `@spaces/spaces-sdk`: SDK público de espacio de trabajo re-exportando la superficie de extensibilidad.
  - `packages/shared`: Deprecado a favor de `@spaces/core`.
