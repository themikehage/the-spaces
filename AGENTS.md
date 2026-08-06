# AGENTS.md - Spaces

Un espacio de trabajo en la nube para manejar todos tus proyectos con el poder de los agentes de IA

## Mandatory Context Files

Before any work, read: `about.md`, `steps.md`, `AGENTS.md` (this file), `.agents/rules/backend.rules.md`, `.agents/rules/frontend.rules.md`. These are the single source of truth.

## Architecture Rules

Non-negotiable coding standards live in `.agents/rules/`:

- `.agents/rules/backend.rules.md` — Server-side principles (Bun + Hono + Zod)
- `.agents/rules/frontend.rules.md` — Client-side principles (React 19 + Vite + Tailwind)

Every PR must respect these rules. Reviewers reject violations.

## Workflow

1. Read the 5 MDs above
2. Pick the next incomplete task from `steps.md`
3. Complete the task, validate, and commit
4. Update `steps.md` to mark it completed
5. Update `about.md` after each major change to keep documentation current

## Commands

- `pnpm dev` - Start client, landing, and server in parallel
- `pnpm build` - Build all apps and packages
- `pnpm --filter client run dev` - Run client development server
- `pnpm --filter landing run dev` - Run landing development server
- `pnpm --filter server run dev` - Run server in watch mode
- `pnpm --filter server run typecheck` - Run TypeScript typecheck on server package

## Maintainability & Modularity Directives

- **Single Responsibility & Sub-modules:** Avoid God Objects (e.g. classes or files > 300 lines). Extract distinct responsibilities into specialized modules (e.g. `EventBus`, `ToolRegistry`, `PromptBuilder`, `CompactionManager`, `NavigationController`).
- **Modular Routing (Sub-router Pattern):** Keep Hono route handlers decomposed into sub-directory modules (`routes/<domain>/index.ts`, `routes/<domain>/<subdomain>-crud.ts`). The root `routes/<domain>/index.ts` must act solely as an assembler of sub-routers.
- **Dependency Injection:** Access core services via `ServerContext` (`createServerContext()`) and port interfaces (`ISessionManager`, `IMcpRegistry`, `IDelegationRegistry`, `IMemoryRegistry`, `IUiApprovalRegistry`) rather than coupling to global singletons directly.
- **Typed Contracts First:** Define shared data models, API payloads, and WebSocket events in `packages/shared` (`ws-messages.ts`, `schemas.ts`) with Zod schemas. Do not invent inline untyped payloads.
- **Tool Registry Standard:** Register and query runtime tools exclusively through `ToolRegistry` and `BaseTool` adapters to prevent tool map state drift.
- **Strict Verification:** Always run `pnpm build` or package typechecks before declaring any feature or refactor completed.

## Code Conventions

- TypeScript strict mode, no `any` types
- Tailwind CSS v4 only, define custom values in `index.css` via `@theme`
- No comments in production code
- Absolute imports: `@/` alias for `client/src/`
- Functional components with React hooks

## Stack

- **Backend:** Bun + Hono + Zod
- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4
- **Shared:** TypeScript library with Zod schemas for shared models and contracts
