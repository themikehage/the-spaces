# Spaces

**A cloud workspace platform for coordinating AI-agent-assisted projects.**

Spaces is a full-stack platform where projects are real execution environments — with files, agents, teams, memory, and live preview — not just task lists. Agents run autonomously, coordinate via delegation, and execute real work through tools, APIs, and MCP servers.

---

## 🤖 OpenAI Build Week: Powered by Codex & GPT-5.6

Spaces was created for the **OpenAI Build Week Hackathon**, leveraging OpenAI's advanced AI models for both product development and core agent runtime execution:

- **OpenAI Codex**: Used during development to accelerate full-stack scaffolding—from generating shared Zod schemas in `packages/shared` to building Hono API routes, WebSocket streaming servers, and React 19 UI components.
- **GPT-5.6**: Powers the primary Controller Agents inside Spaces. It acts as the lead orchestrator, decomposing complex goals into subtasks, directing specialist subagents via `manage_delegations`, and synthesizing real-time decision timelines.

---

## Architecture

Spaces is a pnpm monorepo with four workspaces:

```
openai-hack/
├── apps/
│   ├── client/        React 19 + Vite + Tailwind CSS v4 SPA
│   ├── landing/       Product landing page (React + Vite)
│   └── server/        Bun + Hono API server with WebSocket
├── packages/
│   └── shared/        Zod schemas, types, and contracts
├── docs/              Documentation
└── plans/             Planning artifacts
```

### Apps

| App | Stack | Description |
|-----|-------|-------------|
| **client** | React 19, Vite, Tailwind CSS v4, React Router, Recharts, Framer Motion, Lucide, react-markdown | Main dashboard — chat, projects, agents, teams, sessions, workspace file editor, timeline, kanban, logs, preview, settings |
| **landing** | React 19, Vite, Tailwind CSS v4 | Public-facing product landing page |
| **server** | Bun, Hono, Zod, better-auth, WebSocket | REST API, auth, WebSocket streaming, agent orchestration, MCP integration, preview builder, permissions engine |

### Shared Package

`packages/shared` provides TypeScript types and Zod validation schemas used across client and server — every API contract is defined once.

---

## Features

### Project & Workspace Management
- Create and manage projects with goals, status, and file workspaces
- Real-time file editing with built-in code editor
- Live HTML preview with hot-reload builder

### Agent Orchestration
- Catalog of AI agents with assignable roles and skills
- Multi-agent coordination via `manage_delegations` (spawn + delegate)
- Cancellation controls and real-time activity streaming
- Subagent depth limiting and permission inheritance

### Team Collaboration
- Agent teams with orchestration runners
- Team chat and context sharing
- Visual org flow canvas

### AI Provider Ecosystem
- 9 integrated providers: OpenAI, Google Gemini, xAI (Grok), DeepSeek, Groq, Mistral, OpenRouter, Qwen, OpenCodeGo
- Per-provider model catalog and credential management (encrypted at rest)
- Image generation (`image_gen`) and video generation (`generate_video`)

### Tool System & MCP
- Filesystem tools: read, write, edit (with diff), grep, find, ls, bash
- Web fetch with caching, rate-limiting, HTML-to-markdown extraction
- MCP server registry and marketplace
- Dynamic permission engine per user/session
- Custom tools pipeline engine with approval flows

### Human-in-the-Loop
- Configurable autonomy levels per task/agent
- Mandatory approval points for irreversible actions (deploy, delete, merge)
- Real-time intervention — pause and redirect agents mid-execution

### Observability
- Session timeline and activity log
- Full audit logging
- Image gallery and asset management
- Analytics dashboard

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Bun |
| **Backend** | Hono (TypeScript) |
| **Frontend** | React 19, Vite, Tailwind CSS v4 |
| **Validation** | Zod |
| **Auth** | better-auth + JWT |
| **Real-time** | WebSocket (Bun/Hono) |
| **Persistence** | SQLite (local, encrypted secrets) |
| **Package Manager** | pnpm workspaces |
| **PWA** | vite-plugin-pwa |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [Bun](https://bun.sh/) >= 1.1

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd openai-hack

# Install dependencies
pnpm install

# Set up environment variables
cp apps/server/.env.example apps/server/.env   # if available
cp apps/client/.env.example apps/client/.env   # if available
```

### Development

```bash
# Start all apps in parallel (client, landing, server)
pnpm dev

# Or start individual apps
pnpm --filter client run dev    # http://localhost:5173
pnpm --filter landing run dev   # http://localhost:5174
pnpm --filter server run dev    # http://localhost:3000
```

The client dev server proxies `/api` and `/ws` to the server on port 3000.

### Build

```bash
pnpm build
```

---

## Project Structure

```
apps/client/src/
├── components/       UI components (chat, teams, agents, settings, shared)
├── contexts/         React contexts (auth, sessions, toast)
├── hooks/            Custom React hooks
├── lib/              API client, WebSocket client, utilities
├── pages/            Route pages (15+ pages)
├── router/           Route definitions and guards
└── types/            TypeScript type declarations

apps/server/src/
├── agents/           Agent registry and server creation
├── ai/               AI session management, model registry, tools (read, write, edit, grep, find, ls, bash, web-fetch)
├── auth/             Authentication, middleware, migration
├── config/           Application configuration
├── core/             Core engine — sessions, prompts, tools, permissions, memory, MCP, preview, approvals, multi-agent
├── lib/              Shared server utilities
├── routes/           API route handlers (20+ route modules)
├── teams/            Team orchestration and storage
└── ws/               WebSocket factory, handler, registry
```

---

## API Overview

All API routes are mounted under `/api`:

| Route | Description |
|-------|-------------|
| `/api/auth/*` | Authentication (login, register, session) |
| `/api/sessions` | CRUD sessions and chat streaming |
| `/api/agents` | Agent definitions and management |
| `/api/teams` | Teams, members, and orchestration |
| `/api/providers` | AI provider configuration |
| `/api/models` | Model catalog |
| `/api/files` | File upload and management |
| `/api/preview` | Live project preview |
| `/api/mcp` | MCP server configuration |
| `/api/skills` | Skill management |
| `/api/factory` | Entity factory (agents, projects, teams) |
| `/api/approvals` | Approval workflows |
| `/api/gallery` | Generated assets gallery |
| `/api/logs` | Audit log |
| `/api/backup` | Data backup |
| `/api/settings` | User settings |
| `/api/env` | Environment variables |

WebSocket endpoint: `/ws`

---

## Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `PREVIEW_HOST` | Preview server host header | — |
| `SPACES_DATA_PATH` | Data directory | platform-dependent |

Provider API keys are configured through the UI (Settings → Providers) and stored encrypted.

---

## License

Proprietary — internal use.
