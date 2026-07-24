# Spaces Architecture Guide & Open-Source Readiness Blueprint

Welcome to the **Spaces** architecture documentation. This guide details the domain boundaries, core entities, extension points, and design patterns that make Spaces a modular, extensible, and enterprise-grade multi-agent runtime platform.

---

## 🏛️ Monorepo Structure

Spaces is organized as a lightweight TypeScript monorepo managed with `pnpm`:

```
the-spaces/
├── apps/
│   ├── server/      # Bun + Hono backend server (Agent Runtimes, WS, Rest APIs)
│   ├── client/      # React 19 + Vite frontend application
│   └── landing/     # Vite landing page
├── packages/
│   └── shared/      # Shared Zod schemas, session types, and contract interfaces
├── AGENTS.md        # Workspace rules and workflow directives
└── ARCHITECTURE.md  # Architectural overview (this file)
```

---

## 🧩 Core Architecture Principles

1. **Vendor Loop Separation**: Low-level agent loop execution (`vendor/agent`) is treated as immutable infrastructure code. App-level concerns (WS broadcasting, auditing, project contexts) wrap around the loop without modifying it.
2. **Decoupled Ports & Adapters**: Core singletons (e.g. `DelegationRegistry`, `SessionToolFactory`) communicate via events (`onEvent`) and explicitly injected parameters rather than static imports.
3. **Configurable Runtime Entities**: Standard user sessions, agent servers, and subagents share a single unified initialization engine (`createAgentRuntime`).
4. **Resilient Failure Boundaries**: Structured auditing hooks (`beforeToolCall`, `afterToolCall`) log all tool calls to JSONL logs, providing full visibility when failures occur.

---

## ⚙️ Core Domain Components

### 1. `createAgentRuntime(config)`

`apps/server/src/core/session/agent-runtime.ts`

The single factory for instantiating any AI runtime in the system.

- **Inputs**: `username`, `sessionId`, optional `projectId`, `agentId`, `teamId`, `toolProfile`.
- **Outputs**: `{ session, workspaceDir, sessionDir, model, context }`.
- **Flow**:
  1. Resolves workspace paths, skills, MCP tools, and environment (`resolveAgentContext`).
  2. Resolves preferred AI model via candidate cascade (`DefaultModelResolver`).
  3. Loads persistent memory database (`memoryRegistry`).
  4. Assembles prompt instructions (`sessionPromptBuilder`).
  5. Instantiates tools (`SessionToolFactory`).
  6. Configures audit logging hooks (`afterToolCall`).

### 2. `DefaultModelResolver`

`apps/server/src/core/session/model-resolver.ts`

Resolves the active LLM provider and model for a session using a clean, deterministic cascade:
$$\text{Resolved Model} = \text{sessionModel} \succ \text{agentModel} \succ \text{projectModel} \succ \text{teamModel} \succ \text{userDefaultModel}$$

### 3. `ToolActivationEngine` & `TOOL_GROUPS`

`apps/server/src/core/session/tool-groups.ts` & `tool-activation-engine.ts`

Tools are organized into explicit, controllable categories:

- **`DEFAULT_ALWAYS_ON_TOOLS`**: `request_approval`, `ask_question`, `render_images`, `render_html`, `render_chart`, `share_file`, `refresh_ui`.
- **`TOOL_GROUPS`**: `FILESYSTEM`, `COMMUNICATION`, `DELEGATION`, `MEMORY`, `TASKS`, `VISION`, `FACTORY`, `SEARCH`, `PREVIEW`.

### 4. Event-Driven `DelegationRegistry`

`apps/server/src/core/delegation-registry.ts`

Tracks subagent delegations across parent-child trees. Fully decoupled from transport layers (WebSocket/REST) via `onEvent((username, event) => ...)` event listeners.

### 5. Host Embedding Interface (`SpacesHost`)

`apps/server/src/core/ports/spaces-host.port.ts`

Allows embedding the Spaces agent runtime into external frameworks or custom servers without importing internal web routes.

---

## 🛠️ Extensibility Points

### 1. Custom Tools

Custom executable tools can be registered dynamically via `manage_custom_tools` or stored in user config (`customToolStorage`). At runtime, `createCustomToolRuntime()` wraps them in standard tool interfaces.

### 2. Custom Skills

Skills are file-based prompt modules placed in `.pi/skills/` within any workspace directory. `DefaultResourceLoader` automatically discovers and mounts them into system context.

### 3. MCP Tools (Model Context Protocol)

Spaces supports standard MCP servers via `mcpRegistry`. Server definitions in `mcp.json` automatically expose tools under the `mcp_{serverId}_{toolName}` namespace.

### 4. Custom Memory Stores

Persistent memory implements the `MemoryStore` interface (`apps/server/src/core/memory/`). Alternate vector search engines or database backends can be registered in `memoryRegistry`.

---

## 🧪 Verification & Health Checks

- Build all monorepo apps: `pnpm build`
- Run server dev mode: `pnpm --filter server run dev`
- Run client dev mode: `pnpm --filter client run dev`
