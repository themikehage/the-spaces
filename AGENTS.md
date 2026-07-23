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
- `pnpm --filter client run dev` - Run client development server
- `pnpm --filter landing run dev` - Run landing development server
- `pnpm --filter server run dev` - Run server in watch mode

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
