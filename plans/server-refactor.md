# Spaces — Server Refactor · Arquitectura Desacoplada

> Plan de refactorización incremental del server de Spaces. El objetivo: transformar la estructura actual en una arquitectura limpia, desacoplada y extensible, sin introducir regresiones ni cambios de comportamiento. Inspirado en los principios de auto-browser, adaptado a la realidad de un código legacy vivo.

---

## Tabla de Contenidos

1. [Estado Actual — Diagnóstico](#1-estado-actual--diagnóstico)
2. [Principios de Arquitectura Innegociables](#2-principios-de-arquitectura-innegociables)
3. [Estructura Objetivo](#3-estructura-objetivo)
4. [Plan de Implementación por Fases](#4-plan-de-implementación-por-fases)
5. [God Objects — Plan de Descomposición](#5-god-objects--plan-de-descomposición)
6. [Dependencias entre Módulos](#6-dependencias-entre-módulos)
7. [Contratos de Módulo (Interfaces)](#7-contratos-de-módulo-interfaces)
8. [Estrategia de Verificación](#8-estrategia-de-verificación)
9. [Riesgos y Mitigaciones](#9-riesgos-y-mitigaciones)

---

## 1. Estado Actual — Diagnóstico

### Lo que funciona bien

| Aspecto                | Descripción                                                             |
| ---------------------- | ----------------------------------------------------------------------- |
| **DI Container**       | `ServerContext` (53 líneas) es limpio y swappeable                      |
| **Ports (interfaces)** | 14 interfaces en `core/ports/` siguiendo hexagonal                      |
| **Sub-router pattern** | `routes/sessions/index.ts` y `routes/schedules/index.ts` ya descomponen |
| **Tool Registry**      | `ToolRegistry` implementa `IToolRegistry` con contrato tipado           |
| **Event Bus**          | `TypedEventEmitter` implementa `IEventBus`                              |
| **Permission Engine**  | `PermissionEngine` implementa `IPermissionEngine`                       |
| **Plugin system**      | `core/plugins/` con 3 plugins (audit, memory-enricher, ws-notify)       |
| **TypeScript strict**  | `strict: true` en tsconfig, zero tolerance para `any` en AGENTS.md      |
| **SDK**                | `sdk/spaces-agent.ts` abstrae la creación de agentes                    |

### Problemas estructurales

| Problema                                  | Archivos afectados                                                                                                                                                                          | Severidad  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **God Objects** (6 archivos > 500 líneas) | `routes/sessions.ts` (1356), `routes/files.ts` (981), `core/tools/factory-tool.ts` (903), `ai/agent-session.ts` (790), `core/tools/manage-delegations-tool.ts` (762), `ws/factory.ts` (705) | 🔴 Crítica |
| **Acoplamiento `core` → `ai`**            | `core/` importa de `ai/` (`AgentSession`, `ModelRegistry`, `JsonlSessionStore`, etc.). `core/ports/` importa tipos de `ai/agent-session` (circular).                                        | 🔴 Crítica |
| **Tools dispersas en 2 directorios**      | `ai/tools/` (file I/O: bash, read, write, edit, grep, find, ls) + `core/tools/` (business: factory, delegation, preview, web-fetch) — sin criterio claro de separación                      | 🟡 Alta    |
| **Schemas monolíticos**                   | `packages/shared/src/schemas.ts` + `schemas/` con schemas de todos los dominios mezclados                                                                                                   | 🟡 Alta    |
| **`ai/agent-session.ts` como God Object** | 790 líneas: constructor gigante, 20+ métodos públicos, mezcla prompt loop, compaction, navigation, tool refresh, model management                                                           | 🔴 Crítica |
| **`ws/factory.ts` handler monolítico**    | Un solo `onMessage` con 15+ tipos de mensajes en 705 líneas                                                                                                                                 | 🟡 Alta    |
| **Rutas sin responsabilidad clara**       | `routes/sessions.ts` mezcla: analytics, CRUD, prompts, SSE, tools, skills, context, export, tasks, delegations, subagents, abort, navigation, model settings                                | 🔴 Crítica |
| **130+ archivos en `core/`**              | Demasiados archivos en un solo directorio-raíz; subdirectorios existen pero la raíz sigue densa                                                                                             | 🟡 Alta    |
| **Vendor code vivo**                      | `ai/vendor/` tiene agent-loop y AI SDK — no se sabe si se modificó o es drop-in                                                                                                             | 🟡 Alta    |

### Distribución actual de archivos por módulo

```
src/
├── index.ts              (231) — Entry point
├── preview-server.ts     (256) — Preview static server
│
├── agents/               (4 archivos)   — Agent registry + sub-app boot
├── ai/                   (22 archivos)  — AI engine, session, tools, providers
│   └── vendor/           (externo)
├── auth/                 (7 archivos)   — better-auth integration
├── config/               (1 archivo)    — App config
├── core/                 (130 archivos) — Kernel: tools, session, prompts, stores, etc.
├── lib/                  (3 archivos)   — Cross-cutting utilities
├── middleware/            (1 archivo)   — Re-exports auth middleware
├── routes/               (20 archivos)  — Hono route handlers
├── sdk/                  (4 archivos)   — Programmatic SDK
├── teams/                (5 archivos)   — Multi-agent orchestration
└── ws/                   (4 archivos)   — WebSocket layer
```

---

## 2. Principios de Arquitectura Innegociables

### 2.1 Composición sobre herencia — cero God Objects

Ninguna clase o archivo debe superar 300 líneas. Si crece, se extrae un submódulo con responsabilidad única.

```
CORRECTO: SessionManager orquesta módulos pequeños
INCORRECTO: AgentSession de 790 líneas que lo hace todo
```

### 2.2 Dependencia unidireccional — `core` no importa de `ai`

Hoy `core/` importa de `ai/` (AgentSession, ModelRegistry, JsonlSessionStore). La dirección debe invertirse:

```
CORRECTO:
  ai/          → importa de core/ports/  (implementa interfaces)
  core/session → importa de core/ports/  (usa interfaces, no implementaciones)
  routes/      → importa de core/        (ensambla)

INCORRECTO:
  core/ports/agent-runtime.port.ts → import { AgentSessionEvent } from "../../ai/agent-session"
  core/session-manager.ts          → import { JsonlSessionStore } from "../ai/session-persistence"
```

### 2.3 Tools tipadas con Zod — schemas co-localizados

Cada tool tiene su schema Zod en el mismo archivo o colindante. Nada de schemas monolíticos de 1000 líneas.

### 2.4 Rutas descompuestas por recurso — sub-router pattern

Cada archivo de ruta maneja UN recurso o sub-recurso. El index ensambla. Nada de archivos de ruta > 300 líneas.

### 2.5 WebSocket handlers descompuestos por tipo de mensaje

El `onMessage` gigante de `ws/factory.ts` se parte en handlers por categoría (chat, tools, teams, approvals, admin).

### 2.6 Todo servicio accesible vía ServerContext

Nada de imports directos a implementaciones concretas fuera del DI container. Las rutas y WS handlers reciben `ServerContext` y obtienen lo que necesitan.

### 2.7 Reglas de integridad

| Regla                          | Umbral       | Acción al violar                                   |
| ------------------------------ | ------------ | -------------------------------------------------- |
| Tamaño de archivo              | 300 líneas   | Dividir en módulos especializados                  |
| Tamaño de clase                | 200 líneas   | Extraer submódulo con responsabilidad única        |
| `any` types                    | 0 tolerancia | Usar `unknown` + type guard                        |
| Dependencias circulares        | 0 tolerancia | Invertir con interfaz en `ports/`                  |
| Imports de `ai/` desde `core/` | 0 tolerancia | Mover la interfaz a `ports/`, implementar en `ai/` |
| Schemas monolíticos            | 0 tolerancia | Schemas junto al dominio que los define            |

---

## 3. Estructura Objetivo

```
apps/server/src/
├── index.ts                          # Entry point: Hono + Bun.serve + graceful shutdown
├── preview-server.ts                 # Static preview server (sin cambios)
│
├── config/
│   ├── app-config.ts                 # (existe) Subagent depth + server config
│   └── env.ts                        # NEW: centraliza lectura de env vars
│
├── di/                               # NEW: Dependency Injection (renombrado de server-context)
│   ├── context.ts                    # ServerContext interface + createServerContext()
│   └── modules.ts                    # Registro de todos los servicios default
│
├── ports/                            # MOVED from core/ports/ — interfaces puras
│   ├── agent-runtime.port.ts         # IAgentRuntime (sin imports de implementaciones)
│   ├── model.port.ts                 # ModelProvider, ModelInfo, etc.
│   ├── tool.port.ts                  # ITool, IToolRegistry, ToolContext
│   ├── tool-executor.port.ts         # IToolExecutor
│   ├── prompt-builder.port.ts        # IPromptBuilder, PromptSection
│   ├── hook.port.ts                  # Hook, IHookRunner
│   ├── permission.port.ts            # IPermissionEngine, Rule
│   ├── session-store.port.ts         # ISessionStore, SessionData
│   ├── session-manager.port.ts       # ISessionManager, SessionOverrides
│   ├── sandbox.port.ts               # ISandbox, SandboxResult
│   ├── event-bus.port.ts             # IEventBus
│   ├── memory.port.ts                # IMemoryProvider
│   ├── workspace.port.ts             # IWorkspaceProvider, IWorkspaceConfig
│   ├── delegation.port.ts            # IDelegationRegistry
│   ├── mcp.port.ts                   # IMcpRegistry
│   ├── approval.port.ts              # IUiApprovalRegistry
│   └── spaces-host.port.ts           # SpacesHost
│
├── infrastructure/                   # NEW: Implementaciones de puertos
│   ├── event-bus.ts                  # TypedEventEmitter (moved from core/)
│   ├── tool-registry.ts             # ToolRegistry (moved from core/)
│   ├── tool-executor.ts             # ToolExecutor (moved from core/)
│   ├── hook-runner.ts                # HookRunner (moved from core/)
│   ├── permission-engine.ts          # PermissionEngine (moved from core/)
│   │
│   ├── sandbox/
│   │   ├── local.sandbox.ts          # ISandbox implementation
│   │   └── restricted-paths.ts      # Path blocking
│   │
│   ├── session/
│   │   ├── session-manager.ts        # Refactored from core/session-manager.ts
│   │   ├── session-store.adapter.ts  # Adapter wrapping JsonlSessionStore
│   │   ├── metadata-store.ts         # Session metadata persistence
│   │   └── session-lister.ts         # Session listing/querying
│   │
│   ├── auth/
│   │   ├── storage.ts                # Auth token management
│   │   └── helpers.ts                # Token parsing, user resolution
│   │
│   ├── mcp/
│   │   ├── registry.ts               # MCP server management
│   │   ├── client.ts                 # MCP client
│   │   └── attach.ts                 # MCP tool attachment to sessions
│   │
│   ├── delegation/
│   │   ├── registry.ts               # Delegation tracking
│   │   └── service.ts                # Delegation orchestration
│   │
│   ├── approval/
│   │   ├── registry.ts               # UI approval tracking
│   │   └── manager.ts                # Approval workflow
│   │
│   ├── memory/
│   │   ├── registry.ts               # Memory provider registry
│   │   ├── local-provider.ts         # SQLite memory
│   │   ├── null-provider.ts          # No-op memory
│   │   └── tools.ts                  # memory_store/recall/forget tools
│   │
│   ├── preview/
│   │   ├── builder.ts                # Preview build
│   │   ├── config.ts                 # Preview config resolution
│   │   └── watcher.ts                # File watcher
│   │
│   ├── schedule/
│   │   ├── runner.ts                 # Job runner
│   │   ├── service.ts                # Schedule CRUD
│   │   └── db.ts                     # Schedule DB ops
│   │
│   └── backup/
│       └── safe-zip-extract.ts       # ZIP extraction
│
├── domain/                            # NEW: Lógica de negocio (sin HTTP/WS awareness)
│   ├── agent/
│   │   ├── agent-session.ts           # REFACTORED: AgentRuntime slim class
│   │   ├── agent-loop.ts             # Extracted from vendor/agent/
│   │   ├── compaction-manager.ts     # (moved from ai/)
│   │   ├── context-estimator.ts      # (moved from ai/)
│   │   ├── messages.ts               # Message types and creators
│   │   └── agent-registry.ts         # (moved from agents/)
│   │
│   ├── model/
│   │   ├── model-registry.ts         # Model discovery (moved from ai/)
│   │   ├── model-provider-adapter.ts # Provider abstraction
│   │   ├── model-resolver.ts         # Session model resolution
│   │   └── model-enrichment.ts       # Model enrichment service
│   │
│   ├── prompt/
│   │   ├── builder.ts                # PromptBuilder (moved from core/session/)
│   │   ├── composer.ts               # PromptComposer for layered prompts
│   │   ├── sections/                 # Prompt sections por prioridad
│   │   │   ├── identity.ts           # System identity
│   │   │   ├── rules.ts              # Rules
│   │   │   ├── context.ts            # Workspace context
│   │   │   ├── memory.ts             # Memory retrieval
│   │   │   ├── tools.ts              # Tool descriptions
│   │   │   ├── skills.ts             # Skill injection
│   │   │   └── format.ts             # Output format
│   │   └── fragments/                # Static prompt fragments
│   │
│   ├── tool/                          # Implementaciones de ITool — UNIFICADAS
│   │   ├── file/                     # File I/O tools (from ai/tools/)
│   │   │   ├── bash.tool.ts
│   │   │   ├── read.tool.ts
│   │   │   ├── write.tool.ts
│   │   │   ├── edit.tool.ts
│   │   │   ├── grep.tool.ts
│   │   │   ├── find.tool.ts
│   │   │   ├── ls.tool.ts
│   │   │   └── path-safety.ts
│   │   ├── business/                 # Business tools (from core/tools/)
│   │   │   ├── factory/              # Descompuesto de factory-tool.ts (903 líneas)
│   │   │   │   ├── index.ts
│   │   │   │   ├── contracts.ts
│   │   │   │   ├── project-crud.ts
│   │   │   │   ├── skill-crud.ts
│   │   │   │   ├── agent-crud.ts
│   │   │   │   └── team-crud.ts
│   │   │   ├── delegation/           # Descompuesto de manage-delegations-tool.ts (762 líneas)
│   │   │   │   ├── index.ts
│   │   │   │   ├── spawn-subagent.ts
│   │   │   │   └── delegation-crud.ts
│   │   │   ├── task/                 # Task management tools
│   │   │   │   ├── decompose.ts
│   │   │   │   ├── update.ts
│   │   │   │   └── state-manager.ts
│   │   │   ├── preview.ts            # Preview build/serve
│   │   │   ├── ui.ts                 # UI interaction tools
│   │   │   ├── web-fetch/            # Web fetch with security
│   │   │   │   ├── web-fetch.tool.ts
│   │   │   │   ├── cache.ts
│   │   │   │   ├── extractor.ts
│   │   │   │   ├── rate-limiter.ts
│   │   │   │   └── security.ts
│   │   │   └── media/               # Image/video gen, vision
│   │   │       ├── image-gen.tool.ts
│   │   │       ├── video-gen.tool.ts
│   │   │       └── vision.tool.ts
│   │   └── custom/                   # Custom tools system
│   │       ├── runtime.ts
│   │       ├── pipeline-engine.ts
│   │       ├── storage.ts
│   │       └── manage-tool.ts
│   │
│   ├── session/                      # Session bootstrap & lifecycle (domain logic)
│   │   ├── create-agent-runtime.ts   # REFACTORED: factory
│   │   ├── tool-factory.ts           # Session tool creation
│   │   ├── tool-activation.ts        # Tool filtering/activation
│   │   ├── tool-groups.ts            # Tool group definitions
│   │   ├── after-tool-call.ts        # Post-execution hook
│   │   ├── before-tool-call.ts       # Pre-execution hook
│   │   ├── session-depth.ts          # Subagent depth tracking
│   │   ├── create-user-session.ts    # User session creation
│   │   └── workspace-resolver.ts     # Workspace dir resolution
│   │
│   ├── team/                         # Team orchestration (from teams/)
│   │   ├── orchestrator.ts
│   │   ├── prompt-runner.ts
│   │   ├── store.ts
│   │   └── orchestration-runner.ts
│   │
│   ├── config/                       # Entity config cascade
│   │   ├── cascade-loader.ts
│   │   ├── config-merger.ts
│   │   └── entity-config.ts
│   │
│   ├── scope/                        # Scope-level config
│   │   └── scope-config-manager.ts
│   │
│   └── agent-server/                 # Agent server factory (from agents/)
│       ├── create-agent-server.ts
│       └── types.ts
│
├── storage/                          # NEW: Persistencia (extraída de ai/ + core/stores/)
│   ├── session/
│   │   ├── jsonl.store.ts            # JsonlSessionStore — sin cambios funcionales
│   │   ├── filesystem.store.ts       # File-based session store
│   │   └── memory.store.ts           # In-memory session store (tests)
│   ├── artifact/
│   │   ├── file.store.ts
│   │   └── memory.store.ts
│   ├── skill/
│   │   └── loader.ts                 # Skill loading from filesystem
│   └── resource/
│       └── loader.ts                 # Skills + system prompt loader
│
├── transport/                        # NEW: Capa HTTP/WS (antes routes/ + ws/)
│   ├── rest/
│   │   ├── index.ts                  # Assembla todos los sub-routers
│   │   ├── health.ts                 # GET /api/health
│   │   ├── auth.ts                   # Auth routes
│   │   ├── sessions/                 # DESCOMPUESTO de routes/sessions.ts (1356 líneas)
│   │   │   ├── index.ts             # Sub-router assembler
│   │   │   ├── session-crud.ts      # GET/POST/DELETE sessions
│   │   │   ├── session-prompt.ts    # POST prompt (sync + SSE stream)
│   │   │   ├── session-abort.ts     # POST abort
│   │   │   ├── session-messages.ts  # GET messages, navigation
│   │   │   ├── session-tools.ts     # GET/PUT active tools
│   │   │   ├── session-model.ts     # GET/PUT model settings
│   │   │   ├── session-context.ts   # GET context usage
│   │   │   ├── session-export.ts    # GET export (JSON/JSONL/Markdown)
│   │   │   ├── session-tasks.ts     # GET/PUT tasks
│   │   │   ├── session-subagents.ts # Subagent messages/abort
│   │   │   ├── session-delegations.ts # Delegation CRUD
│   │   │   ├── session-skills.ts    # GET available skills
│   │   │   └── session-analytics.ts # GET analytics
│   │   ├── files/
│   │   │   ├── index.ts             # Sub-router assembler
│   │   │   ├── file-crud.ts         # GET/POST/PUT/DELETE files
│   │   │   ├── file-tree.ts         # GET file tree
│   │   │   └── file-upload.ts       # POST upload
│   │   ├── agents.ts                 # Agent CRUD (decompose if > 300 lines)
│   │   ├── teams.ts                  # Team CRUD (decompose if > 300 lines)
│   │   ├── mcp.ts                    # MCP CRUD
│   │   ├── models.ts                 # Model listing
│   │   ├── providers.ts              # Provider routes
│   │   ├── skills.ts                 # Skills routes
│   │   ├── custom-tools.ts           # Custom tools routes
│   │   ├── config.ts                 # Config routes
│   │   ├── approvals.ts              # Approval routes
│   │   ├── backup.ts                 # Backup routes
│   │   ├── gallery.ts                # Gallery routes
│   │   ├── logs.ts                   # Log routes
│   │   ├── prompts.ts                # Prompt routes
│   │   ├── settings.ts               # User settings routes
│   │   ├── env.ts                    # Env variable routes
│   │   ├── factory.ts                # Factory contract routes
│   │   ├── preview.ts                # Preview routes
│   │   └── schedules/
│   │       ├── index.ts
│   │       ├── jobs-crud.ts
│   │       └── runs-crud.ts
│   │
│   └── ws/                           # WebSocket (DESCOMPUESTO)
│       ├── index.ts                  # Assembla handlers
│       ├── connection.ts             # Connection lifecycle (upgrade, auth, subscribe)
│       ├── registry.ts               # Connection tracking + heartbeat
│       ├── handlers/
│       │   ├── chat.ts               # Prompt, abort, continue, steer
│       │   ├── tools.ts              # Tool execution, approval
│       │   ├── teams.ts              # Team interceptor, broadcast
│       │   ├── admin.ts              # Ping, log streaming
│       │   └── ui.ts                 # UI actions
│       ├── broadcast.ts              # Session/team/user broadcast
│       └── logger.ts                 # WS-specific logging
│
├── providers/                        # NEW: AI providers (extraído de core/providers/)
│   ├── registry.ts                   # ProviderRegistry
│   ├── openai-compatible.ts          # OpenAI-compatible provider
│   ├── persistence.ts                # Provider persistence
│   └── adapters/                     # Provider-specific adapters
│       ├── openai.ts
│       ├── anthropic.ts
│       ├── deepseek.ts
│       ├── google.ts
│       ├── groq.ts
│       ├── mistral.ts
│       ├── qwen.ts
│       ├── xai.ts
│       ├── opencode.ts
│       └── openrouter.ts
│
├── auth/                             # (sin cambios mayores)
│   ├── index.ts
│   ├── config.ts
│   ├── db.ts
│   ├── middleware.ts
│   ├── onboarding.ts
│   ├── ephemeral-tool-session.ts
│   ├── migrate.ts
│   └── plugins/
│
├── middleware/                        # Hono middleware (unificado)
│   ├── index.ts                      # Re-exports
│   ├── auth.ts                       # Auth middleware (was middleware/auth.ts)
│   ├── error-handler.ts
│   ├── rate-limiter.ts
│   ├── request-id.ts
│   ├── security-headers.ts
│   ├── bash-audit-logger.ts
│   └── cors.ts
│
├── sdk/                              # (sin cambios mayores — ya es limpio)
│   ├── index.ts
│   ├── spaces-agent.ts
│   ├── spaces-runner.ts
│   ├── types.ts
│   └── tools/
│
├── lib/                              # Cross-cutting utilities (sin cambios)
│   ├── env-crypto.ts
│   └── event-broker.ts
│
├── plugins/                          # Lifecycle plugins (from core/plugins/)
│   ├── index.ts
│   ├── audit-log.plugin.ts
│   ├── memory-enricher.plugin.ts
│   └── ws-notify.plugin.ts
│
└── vendor/                           # Vendored code (no se toca)
    └── ai/
        ├── agent/
        └── ai/
```

---

## 4. Plan de Implementación por Fases

Cada fase es autocontenida, verificable y no introduce regresiones. Se ejecutan en orden.

### 🔵 Fase 1: Extraer `ports/` del acoplamiento con `ai/`

**Objetivo:** Eliminar los imports de `ai/` desde `core/ports/`. Las interfaces no deben conocer implementaciones.

| #   | Tarea                                                                                                         | Archivos                      | Esfuerzo |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------- |
| 1.1 | Mover `ports/` de `core/ports/` a `src/ports/` (top-level)                                                    | 14 archivos                   | 10 min   |
| 1.2 | Eliminar import de `AgentSessionEvent` en `agent-runtime.port.ts` — usar un tipo propio `AgentRuntimeEvent`   | `ports/agent-runtime.port.ts` | 20 min   |
| 1.3 | Eliminar import de `ContextUsageResult` en `agent-runtime.port.ts` — mover tipo a `ports/` o `shared`         | `ports/agent-runtime.port.ts` | 15 min   |
| 1.4 | Crear `AgentRuntimeEvent` union type en `ports/agent-runtime.port.ts` (antes importado de `ai/agent-session`) | `ports/agent-runtime.port.ts` | 15 min   |
| 1.5 | Actualizar todos los imports: `from "../core/ports/*"` → `from "../ports/*"`                                  | ~40 archivos                  | 30 min   |
| 1.6 | Verificar que `core/` no importa de `ai/` a través de ningún path                                             | —                             | 15 min   |
| 1.7 | `pnpm typecheck` — 0 errores                                                                                  | —                             | 15 min   |

**Resultado:** `ports/` es un módulo puro sin dependencias de `ai/`. `core/` sigue funcionando igual pero los imports ahora son correctos.

---

### 🔵 Fase 2: Crear `infrastructure/` — mover implementaciones de puertos

**Objetivo:** Separar implementaciones concretas (antes en `core/`) en `infrastructure/`. `core/` queda solo con lógica de dominio.

| #    | Tarea                                                                                                                      | Archivos                                  | Esfuerzo |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------- |
| 2.1  | Mover `event-bus.ts`, `tool-registry.ts`, `tool-executor.ts`, `hook-runner.ts`, `permission-engine.ts` a `infrastructure/` | 5 archivos                                | 10 min   |
| 2.2  | Mover `sandbox/` a `infrastructure/sandbox/`                                                                               | `local.sandbox.ts`, `restricted-paths.ts` | 10 min   |
| 2.3  | Mover `core/session-manager.ts` a `infrastructure/session/session-manager.ts`                                              | 1 archivo                                 | 10 min   |
| 2.4  | Mover `core/session/metadata-store.ts`, `session-lister.ts` a `infrastructure/session/`                                    | 2 archivos                                | 5 min    |
| 2.5  | Mover `mcp-registry.ts`, `mcp-client.ts` a `infrastructure/mcp/`                                                           | 2 archivos                                | 10 min   |
| 2.6  | Mover `delegation-registry.ts`, `delegation-service.ts` a `infrastructure/delegation/`                                     | 2 archivos                                | 10 min   |
| 2.7  | Mover `ui-approval-registry.ts`, `approvals/` a `infrastructure/approval/`                                                 | 2 archivos                                | 10 min   |
| 2.8  | Mover `memory/` a `infrastructure/memory/`                                                                                 | 5 archivos                                | 10 min   |
| 2.9  | Mover `preview-builder.ts`, `preview-config.ts`, `preview-watcher.ts` a `infrastructure/preview/`                          | 3 archivos                                | 10 min   |
| 2.10 | Mover `schedules/` a `infrastructure/schedule/`                                                                            | 3 archivos                                | 10 min   |
| 2.11 | Mover `backup/` a `infrastructure/backup/`                                                                                 | 1 archivo                                 | 5 min    |
| 2.12 | Mover `core/providers/` a `infrastructure/providers/` (provisional, se refina en Fase 4)                                   | ~12 archivos                              | 10 min   |
| 2.13 | Mover `core/stores/` a `storage/`                                                                                          | 5 archivos                                | 10 min   |
| 2.14 | Actualizar `ServerContext` y `createServerContext()` con los nuevos paths                                                  | `di/context.ts`                           | 15 min   |
| 2.15 | Actualizar todos los imports en `routes/`, `ws/`, `domain/`                                                                | ~40 archivos                              | 45 min   |
| 2.16 | `pnpm typecheck` — 0 errores                                                                                               | —                                         | 30 min   |

**Resultado:** `infrastructure/` contiene todas las implementaciones concretas de `ports/`. `core/` ahora solo tiene lógica de dominio.

---

### 🔵 Fase 3: Crear `domain/` — extraer lógica de negocio de `ai/` y `core/`

**Objetivo:** Consolidar toda la lógica de dominio pura en `domain/`, limpia de infraestructura.

| #    | Tarea                                                                                                                                 | Archivos     | Esfuerzo |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------- |
| 3.1  | Crear `domain/agent/` con `agent-session.ts` (mover de `ai/`)                                                                         | 1 archivo    | 10 min   |
| 3.2  | Mover `compaction-manager.ts`, `context-estimator.ts`, `messages.ts` a `domain/agent/`                                                | 3 archivos   | 10 min   |
| 3.3  | Mover `agents/agent-registry.ts`, `agents/types.ts` a `domain/agent/`                                                                 | 2 archivos   | 10 min   |
| 3.4  | Crear `domain/model/` con `model-registry.ts`, `model-provider-adapter.ts` (mover de `ai/`)                                           | 2 archivos   | 10 min   |
| 3.5  | Mover `core/session/model-resolver.ts`, `core/providers/model-enrichment-service.ts` a `domain/model/`                                | 2 archivos   | 10 min   |
| 3.6  | Crear `domain/prompt/` con `prompt-builder.ts`, `composer.ts` (mover de `core/session/` y `core/prompts/`)                            | 2 archivos   | 10 min   |
| 3.7  | Mover `core/prompts/fragments/` a `domain/prompt/fragments/`                                                                          | ~10 archivos | 10 min   |
| 3.8  | Crear `domain/tool/` — mover tools unificadas de `ai/tools/` y `core/tools/`                                                          | ~30 archivos | 20 min   |
| 3.9  | Mover `core/session/` (create-agent-runtime, tool-factory, tool-activation, tool-groups, hooks, depth, workspace) a `domain/session/` | ~10 archivos | 15 min   |
| 3.10 | Mover `teams/` a `domain/team/`                                                                                                       | 5 archivos   | 10 min   |
| 3.11 | Mover `core/config/cascade-config-loader.ts`, `config-merger.ts`, `entity-config.ts` a `domain/config/`                               | 3 archivos   | 10 min   |
| 3.12 | Mover `core/scope/` a `domain/scope/`                                                                                                 | 1 archivo    | 5 min    |
| 3.13 | Mover `core/custom-tools/` a `domain/tool/custom/`                                                                                    | 5 archivos   | 10 min   |
| 3.14 | Mover `agents/create-agent-server.ts` a `domain/agent-server/`                                                                        | 1 archivo    | 5 min    |
| 3.15 | Mover `ai/skill-loader.ts`, `ai/load-skills.ts`, `ai/resource-loader.ts` a `storage/skill/` y `storage/resource/`                     | 3 archivos   | 10 min   |
| 3.16 | Actualizar todos los imports — batch global                                                                                           | —            | 60 min   |
| 3.17 | `pnpm typecheck` — 0 errores                                                                                                          | —            | 30 min   |

**Resultado:** `domain/` tiene toda la lógica de negocio organizada por subdominio. `ai/` queda vacío (salvo vendor).

---

### 🔵 Fase 4: Mover providers a módulo `providers/` dedicado

**Objetivo:** Los AI providers tienen su propio módulo, no viven en infrastructure.

| #   | Tarea                                                                        | Archivos     | Esfuerzo |
| --- | ---------------------------------------------------------------------------- | ------------ | -------- |
| 4.1 | Mover `infrastructure/providers/` a `providers/`                             | ~12 archivos | 10 min   |
| 4.2 | Mover `ai/providers/openai-compatible.ts` a `providers/openai-compatible.ts` | 1 archivo    | 5 min    |
| 4.3 | Reorganizar `providers/adapters/` con un archivo por provider                | 9 archivos   | 15 min   |
| 4.4 | Actualizar imports                                                           | ~10 archivos | 15 min   |
| 4.5 | `pnpm typecheck`                                                             | —            | 10 min   |

---

### 🔵 Fase 5: Descomponer rutas — sub-router por recurso

**Objetivo:** `transport/rest/sessions.ts` (1356 líneas) y `transport/rest/files.ts` (981 líneas) se descomponen en sub-routers.

| #    | Tarea                                                                                   | Archivos   | Esfuerzo |
| ---- | --------------------------------------------------------------------------------------- | ---------- | -------- |
| 5.1  | Analizar `sessions.ts`: identificar grupos de endpoints por sub-recurso                 | 1 archivo  | 30 min   |
| 5.2  | Extraer `session-crud.ts`: GET/POST/DELETE sesiones                                     | 1 archivo  | 30 min   |
| 5.3  | Extraer `session-prompt.ts`: POST prompt (sync + SSE streaming)                         | 1 archivo  | 45 min   |
| 5.4  | Extraer `session-abort.ts`: POST abort                                                  | 1 archivo  | 15 min   |
| 5.5  | Extraer `session-messages.ts`: GET messages, navigation                                 | 1 archivo  | 30 min   |
| 5.6  | Extraer `session-tools.ts`: GET/PUT active tools                                        | 1 archivo  | 20 min   |
| 5.7  | Extraer `session-model.ts`: GET/PUT model settings                                      | 1 archivo  | 20 min   |
| 5.8  | Extraer `session-context.ts`: GET context usage                                         | 1 archivo  | 15 min   |
| 5.9  | Extraer `session-export.ts`: GET export (JSON/JSONL/Markdown)                           | 1 archivo  | 30 min   |
| 5.10 | Extraer `session-tasks.ts`: GET/PUT tasks                                               | 1 archivo  | 20 min   |
| 5.11 | Extraer `session-subagents.ts`: subagent messages/abort                                 | 1 archivo  | 30 min   |
| 5.12 | Extraer `session-delegations.ts`: delegation CRUD                                       | 1 archivo  | 30 min   |
| 5.13 | Extraer `session-skills.ts`: GET available skills                                       | 1 archivo  | 15 min   |
| 5.14 | Extraer `session-analytics.ts`: GET analytics                                           | 1 archivo  | 20 min   |
| 5.15 | Crear `sessions/index.ts` que ensambla todos los sub-routers                            | 1 archivo  | 20 min   |
| 5.16 | Descomponer `files.ts` (981 líneas) en `file-crud.ts`, `file-tree.ts`, `file-upload.ts` | 3 archivos | 45 min   |
| 5.17 | Verificar que cada archivo de ruta <= 300 líneas                                        | —          | 15 min   |
| 5.18 | `pnpm typecheck` — 0 errores                                                            | —          | 20 min   |

**Resultado:** Ningún archivo de ruta supera 300 líneas. Cada sub-recurso tiene su propio archivo.

---

### 🔵 Fase 6: Descomponer WebSocket handlers

**Objetivo:** `ws/factory.ts` (705 líneas) se parte por tipo de mensaje.

| #   | Tarea                                                                      | Archivos  | Esfuerzo |
| --- | -------------------------------------------------------------------------- | --------- | -------- |
| 6.1 | Extraer lógica de conexión (upgrade, auth, subscribe) a `ws/connection.ts` | 1 archivo | 30 min   |
| 6.2 | Extraer `handlers/chat.ts`: prompt, abort, continue, steer                 | 1 archivo | 30 min   |
| 6.3 | Extraer `handlers/tools.ts`: tool execution, approval                      | 1 archivo | 30 min   |
| 6.4 | Extraer `handlers/teams.ts`: team interceptor, broadcast                   | 1 archivo | 20 min   |
| 6.5 | Extraer `handlers/admin.ts`: ping, log streaming                           | 1 archivo | 15 min   |
| 6.6 | Extraer `handlers/ui.ts`: UI actions                                       | 1 archivo | 15 min   |
| 6.7 | Extraer `broadcast.ts`: funciones de broadcast                             | 1 archivo | 20 min   |
| 6.8 | Crear `ws/index.ts` que ensambla todo                                      | 1 archivo | 15 min   |
| 6.9 | `pnpm typecheck`                                                           | —         | 15 min   |

---

### 🔵 Fase 7: Descomponer God Objects del dominio

**Objetivo:** Los 3 god objects de dominio se parten en submódulos.

| #   | Tarea                                                                                            | Archivos   | Esfuerzo |
| --- | ------------------------------------------------------------------------------------------------ | ---------- | -------- |
| 7.1 | **`agent-session.ts` (790 líneas)**: Extraer agent loop a `domain/agent/agent-loop.ts`           | 2 archivos | 1h       |
| 7.2 | Extraer navigation tree a `domain/agent/navigation.ts`                                           | 1 archivo  | 30 min   |
| 7.3 | Extraer tool refresh logic a `domain/agent/tool-refresh.ts`                                      | 1 archivo  | 20 min   |
| 7.4 | Extraer model switching a `domain/agent/model-switch.ts`                                         | 1 archivo  | 15 min   |
| 7.5 | Reducir `agent-session.ts` a < 300 líneas (solo orquestación)                                    | 1 archivo  | 30 min   |
| 7.6 | **`factory-tool.ts` (903 líneas)**: Descomponer en `domain/tool/business/factory/` por entidad   | 5 archivos | 1h 30min |
| 7.7 | **`manage-delegations-tool.ts` (762 líneas)**: Descomponer en `domain/tool/business/delegation/` | 2 archivos | 45 min   |
| 7.8 | `pnpm typecheck` — 0 errores                                                                     | —          | 30 min   |

---

### 🔵 Fase 8: Extraer schemas co-localizados

**Objetivo:** Schemas Zod viven junto al dominio que los define, no en un archivo monolítico.

| #   | Tarea                                                                                                        | Archivos     | Esfuerzo |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------ | -------- |
| 8.1 | Mover schemas de `packages/shared/src/schemas/` a sus dominios correspondientes en `apps/server/src/domain/` | ~10 archivos | 45 min   |
| 8.2 | Schemas de sesión → `domain/agent/session.schema.ts`                                                         | 1 archivo    | 15 min   |
| 8.3 | Schemas de tools → `domain/tool/tool.schema.ts`                                                              | 1 archivo    | 15 min   |
| 8.4 | Schemas de team → `domain/team/team.schema.ts`                                                               | 1 archivo    | 15 min   |
| 8.5 | Schemas custom tools → `domain/tool/custom/custom-tool.schema.ts`                                            | 1 archivo    | 10 min   |
| 8.6 | Dejar en `shared/` solo schemas cross-cutting (WS messages, API envelope)                                    | —            | 15 min   |
| 8.7 | `pnpm typecheck` en server + shared                                                                          | —            | 20 min   |

---

### 🔵 Fase 9: Refactor `ai/vendor/` — documentar o extraer

**Objetivo:** Entender qué del vendor code se usa, qué se modificó, y si se puede reemplazar.

| #   | Tarea                                                                              | Esfuerzo |
| --- | ---------------------------------------------------------------------------------- | -------- |
| 9.1 | Auditar `ai/vendor/agent/` — qué funciones se importan desde el server             | 30 min   |
| 9.2 | Auditar `ai/vendor/ai/` — qué funciones se importan desde el server                | 30 min   |
| 9.3 | Documentar en `ai/vendor/README.md`: origen, versión, modificaciones locales       | 20 min   |
| 9.4 | Si el agent-loop se puede reemplazar con una implementación propia simple, hacerlo | 1h       |
| 9.5 | `pnpm typecheck`                                                                   | 15 min   |

---

### 🔵 Fase 10: Verificación final y cleanup

| #    | Tarea                                                                    | Esfuerzo |
| ---- | ------------------------------------------------------------------------ | -------- |
| 10.1 | `pnpm typecheck` en todo el workspace                                    | 15 min   |
| 10.2 | `pnpm build` en server                                                   | 10 min   |
| 10.3 | `pnpm dev` — smoke test: crear sesión, enviar mensaje, recibir streaming | 30 min   |
| 10.4 | Verificar que `core/`, `ai/` están vacíos (salvo vendor)                 | 5 min    |
| 10.5 | Eliminar directorios vacíos (`core/`, `ai/`)                             | 5 min    |
| 10.6 | Verificar límites: ningún archivo > 300 líneas (salvo vendor)            | 15 min   |

---

## 5. God Objects — Plan de Descomposición

### 5.1 `routes/sessions.ts` (1356 líneas) → `transport/rest/sessions/`

```
Antes:
  routes/sessions.ts (1356 líneas — 20+ endpoints mezclados)

Después:
  transport/rest/sessions/
  ├── index.ts                (30 líneas)  — ensambla sub-routers
  ├── session-crud.ts         (~80 líneas) — POST/GET/DELETE sessions
  ├── session-prompt.ts       (~120 líneas) — prompt sync + SSE stream
  ├── session-abort.ts        (~30 líneas) — POST abort
  ├── session-messages.ts     (~80 líneas) — GET messages, navigation
  ├── session-tools.ts        (~60 líneas) — GET/PUT active tools
  ├── session-model.ts        (~60 líneas) — GET/PUT model settings
  ├── session-context.ts      (~40 líneas) — GET context usage
  ├── session-export.ts       (~80 líneas) — export JSON/JSONL/Markdown
  ├── session-tasks.ts        (~60 líneas) — GET/PUT tasks
  ├── session-subagents.ts    (~80 líneas) — subagent messages/abort
  ├── session-delegations.ts  (~80 líneas) — delegation CRUD
  ├── session-skills.ts       (~40 líneas) — GET available skills
  └── session-analytics.ts    (~50 líneas) — GET analytics
```

### 5.2 `ai/agent-session.ts` (790 líneas) → `domain/agent/`

```
Antes:
  ai/agent-session.ts (790 líneas — clase monolítica)

Después:
  domain/agent/
  ├── agent-session.ts        (~250 líneas) — orquestación: constructor, prompt, dispose
  ├── agent-loop.ts           (~150 líneas) — LLM → tools → LLM loop
  ├── navigation.ts           (~120 líneas) — tree navigation
  ├── compaction.ts           (~100 líneas) — session compaction (ya existe, revisar)
  ├── tool-refresh.ts         (~80 líneas)  — tool list refresh
  └── model-switch.ts         (~60 líneas)  — model switching logic
```

### 5.3 `core/tools/factory-tool.ts` (903 líneas) → `domain/tool/business/factory/`

```
Antes:
  core/tools/factory-tool.ts (903 líneas — 4 entidades mezcladas)

Después:
  domain/tool/business/factory/
  ├── index.ts                (30 líneas)  — barrel + register
  ├── contracts.ts            (ya existe, ~375 líneas — sin cambios)
  ├── project-crud.ts         (~150 líneas)
  ├── skill-crud.ts           (~150 líneas)
  ├── agent-crud.ts           (~100 líneas)
  └── team-crud.ts            (~100 líneas)
```

### 5.4 `core/tools/manage-delegations-tool.ts` (762 líneas) → `domain/tool/business/delegation/`

```
Antes:
  core/tools/manage-delegations-tool.ts (762 líneas)

Después:
  domain/tool/business/delegation/
  ├── index.ts                (20 líneas)  — barrel + register
  ├── spawn-subagent.ts       (~200 líneas)
  └── delegation-crud.ts      (~250 líneas)
```

### 5.5 `ws/factory.ts` (705 líneas) → `transport/ws/`

```
Antes:
  ws/factory.ts (705 líneas — un solo onMessage handler)

Después:
  transport/ws/
  ├── index.ts                (30 líneas)  — exporta createWsHandler
  ├── connection.ts           (~100 líneas) — upgrade, auth, subscribe
  ├── registry.ts             (ya existe, ~185 líneas)
  ├── handlers/
  │   ├── chat.ts             (~120 líneas) — prompt, abort, continue, steer
  │   ├── tools.ts            (~100 líneas) — tool execution, approval
  │   ├── teams.ts            (~80 líneas)  — team interceptor, broadcast
  │   ├── admin.ts            (~60 líneas)  — ping, log streaming
  │   └── ui.ts               (~50 líneas)  — UI actions
  ├── broadcast.ts            (~80 líneas)  — session/team/user broadcast
  └── logger.ts               (ya existe, ~35 líneas)
```

---

## 6. Dependencias entre Módulos

```
transport/ (rutas + ws) ──────► di/ (ServerContext) ──────► infrastructure/ (impls)
                                    │                              │
                                    │                              ▼
                                    │                         storage/
                                    │                              │
                                    ▼                              ▼
                              domain/ (lógica pura)          providers/
                                    │
                                    ▼
                              ports/ (interfaces)
                                    │
                                    ▼
                              shared/ (tipos cross-cutting)

auth/ ──────► (independiente, solo usa lib/ y shared/)

middleware/ ──────► auth/, lib/

lib/ ──────► (sin dependencias internas — solo shared/)

sdk/ ──────► domain/session/, shared/
```

**Regla de dependencia:**

- `ports/` no importa de ningún otro módulo interno (solo `shared/` para tipos base)
- `domain/` importa de `ports/` (implementa interfaces) y `shared/`
- `infrastructure/` importa de `ports/` y `domain/` (usa lógica de dominio)
- `storage/` importa de `ports/`
- `providers/` importa de `ports/` y `shared/`
- `transport/` importa de `di/` (obtiene servicios), `ports/` y `shared/`
- `di/` importa de `infrastructure/` y `ports/` (ensambla el grafo)

---

## 7. Contratos de Módulo (Interfaces)

### `ports/agent-runtime.port.ts` (REFACTORED — sin imports de implementaciones)

```ts
import type { IEventBus } from "./event-bus.port";

export interface ContextUsage {
  used: number;
  total: number;
}

export type AgentRuntimeEvent =
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AgentMessage; delta: MessageDelta }
  | { type: "message_end"; message: AgentMessage }
  | { type: "tool_start"; toolCall: ToolCall }
  | { type: "tool_end"; toolCall: ToolCall; result: ToolResult }
  | { type: "agent_start" }
  | { type: "agent_end" }
  | { type: "agent_error"; error: string }
  | { type: "compaction"; summary: string };

export interface IAgentRuntime {
  readonly sessionId: string;
  readonly cwd: string;
  readonly isStreaming: boolean;
  readonly events?: IEventBus<AgentRuntimeEvent>;
  readonly messages: AgentMessage[];

  prompt(message: string, opts?: PromptOptions): Promise<void>;
  continue?(): Promise<void>;
  abort(): Promise<void>;
  dispose(): Promise<void>;
  getMessages(): AgentMessage[];
  getContextUsage(): ContextUsage;
  compact(): Promise<void>;

  on(handler: (event: AgentRuntimeEvent) => void): () => void;
  subscribe(handler: (event: AgentRuntimeEvent) => void): () => void;

  setModel(model: ModelConfig): void;
  setThinkingLevel(level: string): void;
  steer(message: string): Promise<void>;
  followUp(message: string): Promise<void>;
  getActiveToolNames(): string[];
  setActiveToolsByName(names: string[]): void;
  navigateTree(targetMessageId: string, options?: NavigationOptions): Promise<unknown>;
}
```

### `ports/session-manager.port.ts` (sin cambios funcionales)

```ts
import type { IAgentRuntime } from "./agent-runtime.port";

export interface SessionOverrides {
  model?: { provider: string; modelId: string };
  resourceLoader?: unknown;
  customTools?: unknown[];
  workspaceDir?: string;
  skipMcpTools?: boolean;
  skipMemory?: boolean;
}

export interface ISessionManager {
  getSession(username: string, sessionId: string): IAgentRuntime | null;
  getOrCreateSession(
    username: string,
    sessionId: string,
    projectId?: string,
    agentId?: string,
    overrides?: SessionOverrides,
  ): Promise<IAgentRuntime>;
  destroySession(username: string, sessionId: string): Promise<void>;
}
```

### `ports/session-store.port.ts` (sin cambios funcionales)

```ts
export interface SessionData {
  id: string;
  username: string;
  projectId?: string;
  agentId?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodeCount?: number;
}

export interface ISessionStore {
  appendMessage(sessionId: string, message: AgentMessage): Promise<void>;
  getMessages(sessionId: string): AgentMessage[];
  listSessions(username: string): SessionData[];
  deleteSession(sessionId: string): Promise<void>;
  createSession(data: SessionData): Promise<void>;
  updateSession(sessionId: string, data: Partial<SessionData>): Promise<void>;
}
```

### `ports/tool.port.ts` (REFACTORED — Zod en vez de Record)

```ts
import type { ZodSchema } from "zod";

export interface ToolContext {
  sessionId?: string;
  toolCallId: string;
  signal?: AbortSignal;
  onUpdate?: (partial: unknown) => void;
}

export interface ITool {
  readonly name: string;
  readonly description: string;
  readonly label?: string;
  readonly parameters: ZodSchema;
  readonly category?: string;
  readonly requiresApproval?: boolean;
  execute(toolCallId: string, params: unknown, ctx?: ToolContext): Promise<unknown>;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface IToolRegistry {
  register(tool: ITool): void;
  get(name: string): ITool | undefined;
  list(): ITool[];
  getActive(): ITool[];
  setActive(tools: ITool[]): void;
  toLLMFormat(): LLMToolDefinition[];
  clear(): void;
}
```

---

## 8. Estrategia de Verificación

### Después de cada fase

```bash
pnpm --filter server run typecheck    # 0 errores
pnpm --filter server run build        # build exitoso
```

### Después de fases críticas (1, 3, 5, 7)

```bash
pnpm dev                              # smoke test manual:
                                       # 1. Crear sesión (POST /api/sessions)
                                       # 2. Enviar mensaje vía WS
                                       # 3. Verificar streaming
                                       # 4. Listar sesiones (GET /api/sessions)
                                       # 5. Eliminar sesión (DELETE /api/sessions/:id)
                                       # 6. Verificar MCP tools cargan
                                       # 7. Verificar delegaciones funcionan
```

### Antes de merge

```bash
pnpm build                            # Build de todo el workspace
pnpm typecheck                        # TypeScript strict
pnpm --filter server test             # Tests existentes (si los hay)
```

---

## 9. Riesgos y Mitigaciones

| Riesgo                                         | Probabilidad | Impacto | Mitigación                                                                                                        |
| ---------------------------------------------- | ------------ | ------- | ----------------------------------------------------------------------------------------------------------------- |
| **Regresiones por cambio de imports**          | Alta         | Alto    | Cada fase termina con `pnpm typecheck`. Los imports se actualizan con find+replace preciso, no manual.            |
| **Cambios de comportamiento en agent-session** | Media        | Alto    | Fase 7 solo extrae métodos a submódulos; no cambia lógica interna. Cada extracción se verifica con typecheck.     |
| **Rutas rotas por descomposición**             | Media        | Alto    | Fase 5 usa el sub-router pattern que ya funciona en `sessions/index.ts`. Cada sub-ruta se testea individualmente. |
| **WS handlers rotos**                          | Media        | Medio   | Fase 6 extrae handlers uno por uno; el tipo de mensaje hace de contrato.                                          |
| **Pérdida de contexto entre fases**            | Baja         | Medio   | Cada fase es un commit atómico. Si algo falla, se revierte esa fase.                                              |
| **Vendor code incompatible**                   | Baja         | Alto    | Fase 9 solo documenta, no modifica. Si se reemplaza, se hace al final con tests.                                  |
| **El plan es muy grande**                      | Alta         | Bajo    | Las fases 1-4 son mover archivos (bajo riesgo). Las fases 5-7 son las de alto valor. Se pueden priorizar.         |

---

## Volumen Estimado

| Fase      | Descripción                    | Archivos movidos/creados | Esfuerzo | Riesgo   |
| --------- | ------------------------------ | ------------------------ | -------- | -------- |
| 1         | Extraer ports del acoplamiento | 14                       | 2h       | 🟢 Bajo  |
| 2         | Crear infrastructure/          | ~30                      | 3.5h     | 🟢 Bajo  |
| 3         | Crear domain/                  | ~40                      | 4.5h     | 🟡 Medio |
| 4         | Mover providers                | ~12                      | 1h       | 🟢 Bajo  |
| 5         | Descomponer rutas              | ~17                      | 6h       | 🟡 Medio |
| 6         | Descomponer WS handlers        | ~8                       | 3h       | 🟡 Medio |
| 7         | Descomponer God Objects        | ~10                      | 5.5h     | 🔴 Alto  |
| 8         | Schemas co-localizados         | ~10                      | 2h       | 🟡 Medio |
| 9         | Auditar vendor                 | 1                        | 2.5h     | 🟡 Medio |
| 10        | Verificación final             | —                        | 1.5h     | 🟢 Bajo  |
| **Total** |                                | **~140 archivos**        | **~31h** |          |

---

## Apéndice — Comandos Útiles Durante el Refactor

```bash
# Typecheck rápido del server
pnpm --filter server run typecheck

# Build del server
pnpm --filter server run build

# Dev mode para smoke test
pnpm --filter server run dev

# Encontrar todos los imports que romperían
rg "from \"\.\./ai/" src/ --type ts
rg "from \"\.\./core/" src/ --type ts

# Verificar archivos > 300 líneas
find src/ -name "*.ts" -exec wc -l {} + | sort -rn | head -20
```
