# Plan 15 — Migración a Arquitectura Core (auto-browser)

> Migrar `apps/server` y `apps/client` a la arquitectura limpia definida en `out/auto-browser/`, sin romper funcionalidad existente. Branch: `refactor-core`.

---

## Contexto y Motivación

### Estado actual (`apps/server`)

| Problema | Evidencia |
|---|---|
| God object central | `AgentSession` ~28 KB, `SessionManager` ~11 KB — orquestan todo |
| Singletons globales | `mcpRegistry`, `memoryRegistry`, `sessionManager`, `uiApprovalRegistry` importados directamente |
| Acoplamiento fuerte | `routes/sessions.ts` (~43 KB) conoce detalles de MCP, compaction, tools, delegación |
| Ausencia de ports | `core/ports/` existe pero tiene solo 4 archivos; la mayoría de contratos están inline |
| Lógica mezclada | Agent loop, prompt building, tool execution y persistencia coexisten en `ai/agent-session.ts` |
| `any` types | `SessionOverrides.customTools?: any[]` y más en session-manager |

### Estado actual (`apps/client`)

| Problema | Evidencia |
|---|---|
| Páginas monolíticas | `AgentsPage.tsx` ~49 KB, `routes/sessions.ts` en server ~43 KB |
| Hooks con responsabilidades múltiples | `useWorkspaceContext.ts` ~10 KB maneja routing, estado global y WS |
| Ausencia de capa API tipada | Fetch directo en componentes/hooks sin contrato compartido |

### Arquitectura objetivo (`out/auto-browser/`)

Arquitectura limpia con:
- `packages/core` — Interfaces puras (ports), tipos, schemas Zod
- `packages/engine` — `AgentRuntime` que compone deps inyectadas
- `packages/tools`, `providers`, `storage`, `sandbox` — implementaciones aisladas
- `apps/server` — Hono thin, delega todo al engine
- `apps/client` — React mínimo, solo REST + WS

---

## Principios Innegociables (de `AGENTS.md`)

1. **Composición > herencia** — cero god objects, cero singletons
2. **Tipos de agente como factories** — misma clase `AgentRuntime`, distintas dependencias
3. **Prompt pipeline por secciones** — no lógica spaghetti
4. **Hooks como middleware chain** — con short-circuit (`null` bloquea)
5. **Rules declarativas** — separadas de hooks, sin side effects
6. **Tool registry tipado** — Zod desde el día 0
7. **Sandbox e IWorkspace inyectables** — el core nunca ejecuta nada directamente

**Límites de integridad:** clases < 200 líneas, archivos < 300 líneas, cero `any`, cero dependencias circulares, cero singletons.

---

## Estrategia General

```
the-spaces/apps/server  ─────────────►  refactored/apps/server
                                         (thin Hono, delega a packages/)
the-spaces/apps/client  ─────────────►  refactored/apps/client
                                         (React limpio, API layer tipada)

                                         + packages/ nuevos:
                                           core / engine / tools
                                           providers / storage / sandbox
```

**Enfoque**: migración incremental por capas. Cada hito es autónomo y buildeable. El sistema funciona al final de cada hito.

### Lo que se REUTILIZA (adaptar)

| Fuente (the-spaces) | Destino | Adaptación |
|---|---|---|
| `ai/vendor/agent/src/agent-loop.ts` | `packages/engine/src/agent-loop.ts` | Desacoplar tipos internos → interfaces del core |
| `ai/session-persistence.ts` | `packages/storage/src/filesystem.store.ts` | Adaptar a `ISessionStore`, eliminar tree navigation |
| `ai/model-registry.ts` | `packages/providers/src/openai-compatible.ts` | Simplificar a provider genérico único |
| `ai/bash-tool.ts` + tools/ | `packages/tools/src/*.tool.ts` | Adaptar a `ITool` con Zod schema |
| `core/event-bus.ts` | `packages/engine/src/event-bus.ts` | Mismo patrón, tipado con `AgentEvent` union |
| `client/hooks/useWebSocket.ts` | `client/src/hooks/useWebSocket.ts` | Simplificar tipos de mensajes |
| `client/lib/ws-client.ts` | `client/src/api/ws.ts` | Misma lógica, mensajes del core |
| `packages/shared/src/schemas.ts` | `packages/core/src/schemas/` | Extraer solo session + message schemas |

### Lo que se REESCRIBE desde cero

- `AgentSession` (god object) → `AgentRuntime` compuesto con DI
- `SessionManager` (singleton) → `AppContext` (DI container)
- Rutas de server (20+ rutas mezcladas) → 3 endpoints + 1 WS handler en el MVP; el resto migra progresivamente
- Layout y páginas monolíticas del cliente → componentes < 200 líneas

---

## Hoja de Ruta — Hitos

### Hito 0: Monorepo Foundation — ✅ [COMPLETADO](completed/15-hito-0-monorepo-foundation.md)

**Objetivo**: estructura de paquetes lista, workspaces resueltos, CI en verde. No toca funcionalidad existente.

| Tarea | Archivos | Estado |
|---|---|---|
| Crear `packages/core/package.json` | `packages/core/` | ✅ `name: @spaces/core` |
| Crear `packages/engine/package.json` | `packages/engine/` | ✅ depende de `@spaces/core` |
| Crear `packages/tools/package.json` | `packages/tools/` | ✅ depende de `@spaces/core` |
| Crear `packages/providers/package.json` | `packages/providers/` | ✅ depende de `@spaces/core` |
| Crear `packages/storage/package.json` | `packages/storage/` | ✅ depende de `@spaces/core` |
| Crear `packages/sandbox/package.json` | `packages/sandbox/` | ✅ depende de `@spaces/core` |
| Actualizar `pnpm-workspace.yaml` | raíz | ✅ `packages/*` resueltos |
| Configurar Turborepo (`turbo.json`) | raíz | ✅ pipeline funcional |
| `pnpm install` y verificar workspaces | — | ✅ todos los paquetes resueltos |

**Criterio de done**: `pnpm build` y `pnpm typecheck` pasaron exitosamente en todo el workspace.

---

### Hito 1: Core — Interfaces Puras

**Objetivo**: `@spaces/core` completo con todos los ports, tipos y schemas. Cero implementaciones. Cero dependencias externas salvo Zod.

| Tarea | Archivo destino |
|---|---|
| Tipos base: `AgentMessage`, `LLMMessage`, `ToolCall`, `ToolResult`, `MessageDelta`, `ContextUsage` | `packages/core/src/types.ts` |
| Contextos: `AgentContext`, `ToolContext`, `PromptContext`, `RuleContext` | `packages/core/src/types.ts` |
| `IEventBus<T>` + `AgentEvent` union | `packages/core/src/ports/event-bus.port.ts` + `events.ts` |
| `IModelProvider` (streamComplete) | `packages/core/src/ports/model.port.ts` |
| `ITool`, `IToolRegistry`, `IToolExecutor`, `LLMToolDefinition` | `packages/core/src/ports/tool.port.ts` |
| `PromptSection`, `IPromptBuilder` | `packages/core/src/ports/prompt.port.ts` |
| `Hook`, `IHookRunner` | `packages/core/src/ports/hook.port.ts` |
| `Rule`, `IPermissionEngine` | `packages/core/src/ports/permission.port.ts` |
| `ISessionStore` (create, appendMessage, getMessages, listSessions, delete) | `packages/core/src/ports/session.port.ts` |
| `ISandbox`, `SandboxOptions`, `SandboxResult` | `packages/core/src/ports/sandbox.port.ts` |
| `IWorkspaceProvider` | `packages/core/src/ports/workspace.port.ts` |
| `IMemoryProvider` (stub para futuro) | `packages/core/src/ports/memory.port.ts` |
| `IAgentRuntime` + `AgentRuntimeDependencies` | `packages/core/src/ports/agent.port.ts` |
| Schemas Zod: `SessionSchema`, `MessageSchema`, `ToolCallSchema` | `packages/core/src/schemas/` |
| Barrel export | `packages/core/src/index.ts` |

**Criterio de done**: `pnpm --filter @spaces/core typecheck` → 0 errores.

---

### Hito 2: Engine — AgentRuntime

**Objetivo**: implementación del runtime desacoplado del vendor. El agent loop extraído de `ai/vendor/`.

| Tarea | Archivo destino | Fuente |
|---|---|---|
| `EventBus` | `packages/engine/src/event-bus.ts` | `core/event-bus.ts` (adaptar) |
| `PromptBuilder` — pipeline de secciones | `packages/engine/src/prompt-builder.ts` | `ai/prompt-builder.ts` (adaptar) |
| `HookRunner` — middleware chain | `packages/engine/src/hook-runner.ts` | nuevo |
| `PermissionEngine` — evaluador de rules | `packages/engine/src/permission-engine.ts` | nuevo |
| `ToolExecutor` — registry + execute + hooks | `packages/engine/src/tool-executor.ts` | `core/tool-registry.ts` (adaptar) |
| `AgentRuntime` — compone todo, implementa `IAgentRuntime` | `packages/engine/src/agent-runtime.ts` | `ai/agent-session.ts` (reescribir) |
| `runAgentLoop` — extraído del vendor | `packages/engine/src/agent-loop.ts` | `ai/vendor/agent/src/agent-loop.ts` |
| `createAgent()` factory | `packages/engine/src/factories/default.agent.ts` | nuevo |
| Barrel export | `packages/engine/src/index.ts` | — |

> **Punto crítico**: `AgentSession` tiene ~28 KB. El agent-loop del vendor debe desacoplarse de sus tipos internos y usar las interfaces del core. Es la tarea de mayor riesgo del proyecto.

**Criterio de done**: `pnpm --filter @spaces/engine typecheck` → 0 errores.

---

### Hito 3: Providers + Storage + Sandbox

**Objetivo**: implementaciones concretas de las interfaces del core.

#### Providers (`@spaces/providers`)

| Tarea | Archivo | Fuente |
|---|---|---|
| `OpenAICompatibleProvider` (fetch + SSE streaming) | `packages/providers/src/openai-compatible.ts` | `ai/model-registry.ts` (simplificar) |
| `ProviderRegistry` | `packages/providers/src/provider-registry.ts` | nuevo |

> `ai/model-registry.ts` tiene 14 KB con lógica de multi-provider. Simplificar a un provider genérico que funciona con OpenAI, Anthropic, Groq, DeepSeek via base URL distinta.

#### Storage (`@spaces/storage`)

| Tarea | Archivo | Fuente |
|---|---|---|
| `MemorySessionStore` (dev/tests) | `packages/storage/src/memory.store.ts` | nuevo |
| `FilesystemSessionStore` (JSONL en disco) | `packages/storage/src/filesystem.store.ts` | `ai/session-persistence.ts` (adaptar, ~19 KB) |

> Adaptar a `ISessionStore`. Eliminar tree navigation y branch logic para este hito.

#### Sandbox (`@spaces/sandbox`)

| Tarea | Archivo | Fuente |
|---|---|---|
| `LocalSandbox` (child_process local) | `packages/sandbox/src/local.sandbox.ts` | lógica de `bash-tool.ts` |
| `RestrictedPaths` | `packages/sandbox/src/restricted-paths.ts` | `ai/restricted-paths.ts` |

**Criterio de done**: `pnpm typecheck` en los 3 paquetes → 0 errores.

---

### Hito 4: Tools — Implementaciones ITool

**Objetivo**: tools migradas al contrato `ITool` con Zod schema obligatorio. Cada tool < 100 líneas.

| Tarea | Archivo | Fuente |
|---|---|---|
| `read` tool | `packages/tools/src/read.tool.ts` | `ai/tools/` |
| `write` tool | `packages/tools/src/write.tool.ts` | `ai/tools/` |
| `edit` tool | `packages/tools/src/edit.tool.ts` | `ai/tools/` |
| `glob` tool | `packages/tools/src/glob.tool.ts` | `ai/tools/` |
| `grep` tool | `packages/tools/src/grep.tool.ts` | `ai/tools/` |
| `bash` tool | `packages/tools/src/bash.tool.ts` | `ai/bash-tool.ts` (~11 KB, adaptar) |
| `webfetch` tool | `packages/tools/src/webfetch.tool.ts` | nuevo |
| `DefaultToolRegistry` | `packages/tools/src/index.ts` | registry pre-poblado |

> Si `bash-tool.ts` supera el límite de 100 líneas, extraer el parsing de output a módulo separado.

**Criterio de done**: `pnpm --filter @spaces/tools typecheck` → 0 errores.

---

### Hito 5: Server — Hono Thin

**Objetivo**: reemplazar el server monolítico por uno que delega al engine. Las rutas avanzadas conviven durante la transición.

#### Estrategia de convivencia

El server existente sigue funcionando. El nuevo `AppContext` reemplaza los singletons globales. Las rutas migran una a una.

```
apps/server/src/
├── context.ts          ← NUEVO: AppContext (reemplaza singletons)
├── config.ts           ← NUEVO: config desde env
├── routes/
│   ├── sessions/
│   │   ├── index.ts           ← assembler
│   │   ├── sessions-crud.ts   ← POST/GET/DELETE /sessions
│   │   └── sessions-ws.ts     ← WS handler
│   └── [resto de rutas — sin cambios por ahora]
└── ws/
    └── handler.ts      ← REFACTOR: usar AgentRuntime events
```

| Tarea | Detalle |
|---|---|
| Crear `AppContext` | Reemplaza `createServerContext()` con deps del engine inyectadas |
| Migrar `POST /sessions` | Crea `AgentRuntime` en lugar de `AgentSession` |
| Migrar `GET /sessions` | Usa `ISessionStore.listSessions()` |
| Migrar `DELETE /sessions/:id` | `agent.dispose()` + `sessionStore.delete()` |
| Migrar WS handler | Forward de `agent.events` al WS client |
| Migrar `GET /health` | Sin cambios |
| Eliminar singletons de sessions | Inyectar por `AppContext` |

> Rutas que NO migran en este hito: `/teams`, `/schedules`, `/approvals`, `/mcp`, `/backup`, `/preview`, `/files`, `/gallery`.

**Criterio de done**: `pnpm --filter @spaces/server typecheck` → 0 errores. Flujo de chat funciona end-to-end.

---

### Hito 6: Client — API Layer + Hooks Base

**Objetivo**: cliente con capa API tipada y hooks base. Sin romper la UI existente.

#### API Layer (`src/api/`)

| Tarea | Archivo |
|---|---|
| `apiFetch` wrapper tipado | `src/api/client.ts` |
| `WsClient` con reconexión + cola offline | `src/api/ws.ts` |

> **Fuente**: `lib/ws-client.ts` existente — adaptar a mensajes del core.

#### Hooks base

| Tarea | Archivo | Fuente |
|---|---|---|
| `useWebSocket` (auto-subscribe por sessionId) | `src/hooks/useWebSocket.ts` | `hooks/useWebSocket.ts` (simplificar) |
| `useSessions` (CRUD: list, create, delete, select) | `src/hooks/useSessions.ts` | extraer de hooks actuales |
| `useChat` (messages, streaming, send, abort) | `src/hooks/useChat.ts` | extraer de hooks actuales |

**Criterio de done**: `pnpm --filter @spaces/client typecheck` → 0 errores. Chat funciona con el nuevo server.

---

### Hito 7: Client — Componentes Core

**Objetivo**: componentes de chat refactorizados, < 200 líneas cada uno.

| Componente | Descripción | Límite |
|---|---|---|
| `Layout.tsx` | Shell: header + sidebar + main, responsive | < 150 líneas |
| `SessionList.tsx` | Sidebar: crear/seleccionar/eliminar | < 150 líneas |
| `MessageBubble.tsx` | Burbuja user/assistant con avatar | < 100 líneas |
| `Markdown.tsx` | Renderer con react-markdown | < 80 líneas |
| `MessageList.tsx` | Lista + scroll automático + tool calls básicos | < 200 líneas |
| `ChatInput.tsx` | Textarea + send/stop, Enter envía | < 100 líneas |
| `ChatArea.tsx` | Compone MessageList + ChatInput + useChat | < 150 líneas |

> Las páginas avanzadas (`AgentsPage`, `TeamsPage`, etc.) se migran en el Hito 8.

**Criterio de done**: smoke test manual — crear sesión, chat con streaming, listar, eliminar.

---

### Hito 8: Migración de Features Avanzados

**Objetivo**: migrar features existentes a la nueva arquitectura sin romper funcionalidad.

#### 8a — MCP Integration
- `McpToolAdapter` implementa `ITool` usando el MCP client existente
- `McpHook` para logging/audit de tool calls MCP
- Registrar en `IToolRegistry` desde `AppContext`

#### 8b — Approvals
- `ApprovalHook` implementa `Hook.beforeToolCall` → `null` si deniega
- Conectar con el WS de aprobación existente
- Eliminar `uiApprovalRegistry` singleton

#### 8c — Schedules
- `ScheduleService` como dependencia inyectable en `AppContext`
- Rutas `/schedules` migran al patrón sub-router

#### 8d — Teams / Multi-agent
- `createTeamAgent()` factory que compone múltiples `AgentRuntime`
- `DelegationHook` implementa `Hook` para delegación
- Eliminar `delegationRegistry` singleton

#### 8e — Memory / RAG
- `MemoryPromptSection` implementa `PromptSection` (priority: 30)
- `IMemoryProvider` ya definido en core — enchufar implementación concreta

#### 8f — Custom Tools
- `CustomToolAdapter` implementa `ITool` con schema Zod generado dinámicamente
- Cargados en `AppContext` por sesión/entidad

**Criterio de done por subsistema**: typecheck + prueba funcional del feature migrado.

---

### Hito 9: Integración Final y Limpieza

**Objetivo**: sistema completo, sin código legacy, build limpio.

| Tarea |
|---|
| Eliminar `AgentSession` (god object) |
| Eliminar singletons globales (`sessionManager`, `mcpRegistry`, `memoryRegistry`, `uiApprovalRegistry`, `delegationRegistry`) |
| Eliminar `ai/vendor/` (extraído al engine) |
| `pnpm typecheck` workspace completo → 0 errores |
| `pnpm build` workspace completo → exitoso |
| `pnpm lint` → 0 errores |
| Prueba manual end-to-end de todos los features |
| Actualizar `AGENTS.md` del workspace con la nueva arquitectura |

---

## Mapa de Dependencias

```
packages/core          (sin deps externas salvo Zod)
    ▲
    ├── packages/engine     (implementa los ports del core)
    ├── packages/tools      (implementa ITool)
    ├── packages/providers  (implementa IModelProvider)
    ├── packages/storage    (implementa ISessionStore)
    └── packages/sandbox    (implementa ISandbox)
              ▲
              └── apps/server    (consume todos los paquetes, Hono thin)

apps/client            (independiente — solo llama REST + WS)
```

**Regla de dependencia**: el core no importa de nadie. Los paquetes no se importan entre sí. Las apps importan de los paquetes. Nunca al revés.

---

## Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Agent loop del vendor acoplado a tipos internos | Alta | Alto | Leer vendor antes de extraer; crear adapter types si hace falta |
| `session-persistence.ts` (19 KB) con lógica de branch/tree | Media | Medio | Aislar solo CRUD de mensajes para este hito; branch navigation en Hito 8 |
| Rutas del server con lógica de negocio embebida | Alta | Medio | Migrar ruta por ruta, no big bang |
| `AgentSession` referenciada desde múltiples singletons | Alta | Alto | Hito 5 debe romper la dependencia circular con `AppContext` antes de eliminar singletons |
| SSE streaming en OpenAI-compatible puede tener quirks | Media | Alto | Testear manualmente antes de integrar al engine |
| `useWorkspaceContext` (10 KB) como estado global del cliente | Alta | Medio | Reemplazar gradualmente: primero `useChat`, luego el resto |

---

## Criterios de Completitud por Hito

Un hito está **completo** cuando:
1. `pnpm typecheck` en el paquete afectado → 0 errores
2. `pnpm build` en el paquete afectado → exitoso
3. Ningún archivo nuevo > 300 líneas
4. Ninguna clase nueva > 200 líneas
5. Cero `any` en código nuevo
6. El flujo de chat funciona end-to-end (desde Hito 5 en adelante)

---

## Estimación de Esfuerzo

| Hito | Complejidad | Estimado |
|---|---|---|
| 0 — Monorepo Foundation | Baja | 2h |
| 1 — Core Interfaces | Baja | 3h |
| 2 — Engine / AgentRuntime | Muy Alta | 8h |
| 3 — Providers + Storage + Sandbox | Alta | 5h |
| 4 — Tools | Media | 3h |
| 5 — Server Thin | Alta | 6h |
| 6 — Client API Layer + Hooks | Media | 4h |
| 7 — Client Components | Media | 4h |
| 8 — Features Avanzados (a–f) | Alta | 12h |
| 9 — Integración Final | Media | 3h |
| **Total** | | **~50h** |

---

## Comandos de Referencia

```bash
# Verificación por paquete
pnpm --filter @spaces/core typecheck
pnpm --filter @spaces/engine typecheck
pnpm --filter @spaces/server typecheck
pnpm --filter @spaces/client typecheck

# Verificación global
pnpm typecheck
pnpm build
pnpm lint

# Desarrollo
pnpm dev
pnpm --filter @spaces/server dev
pnpm --filter @spaces/client dev
```

---

## Referencias

- Arquitectura objetivo: `out/auto-browser/PLAN.md`
- Patrones innegociables: `out/auto-browser/AGENTS.md`
- Reglas del workspace: `AGENTS.md`
- Branch activo: `refactor-core`
