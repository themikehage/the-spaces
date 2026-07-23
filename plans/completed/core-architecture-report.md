# Spaces — Core Runtime (reporte condensado)

**Rama:** `master` @ `613a353` · **Fecha:** 2026-07-23  
**Objetivo:** Definir el núcleo real, los puntos de acoplamiento y la frontera de un SDK antes de extender (config por workspace, modelos por entidad, payloads de delegación, etc.).

---

## 1. Tesis

Spaces es un **runtime de agentes multi-tenant basado en filesystem**, no un chat con tools.

El vendor (`@vendor/agent` + `@vendor/ai`) ya tiene loop, hooks y casi un SDK (`Agent` / `AgentHarness`). Spaces lo envuelve con producto (`SessionManager` → `AgentSession`) y **reimplementa** sesión, modelos, prompts y tools con singletons y deep-imports.

**Regla:** ninguna feature nueva debe tocar `agent-loop.ts`. Debe colgar de puertos del runtime.

---

## 2. Capas

```
client (UI)
  → REST + WS
server/routes + ws
  → CORE producto (session, workspace, tools, HITL, delegations, sandbox…)
  → APP AI (AgentSession, ModelRegistry, JSONL, resource-loader)
  → VENDOR (Agent loop, streamSimple, types)
  → packages/shared (Zod, paths, envelope, prefixes)
```

---

## 3. Mapa mental original (confirmado)

| Pieza | Dónde | Notas |
|---|---|---|
| **Loop** | `vendor/agent` `agent-loop.ts`, `agent.ts` | Sólido; Spaces **bypasea** `AgentHarness` |
| **Modelos** | `ai/model-registry.ts` + `core/providers/*` | Cascada session→agent→user; **sin** project |
| **System prompts** | `prompt-builder` + `prompts/*` + `resource-loader` | Dos ensambladores sumados |
| **Hooks tools** | Vendor before/after; app solo **before** | HITL + sandbox; `afterToolCall` no cableado |
| **Workspace** | `workspace-resolver` + cwd/sandbox | Unidad natural de config futura |
| **HITL** | `before-tool-call-hook` + `approvalManager` | `auto \| propose \| suggest` |
| **Tools** | `tool-factory` → `tool-activation` → MCP | Always-on duplicados en 4 sitios |
| **Delegaciones** | `manage_delegations` + registry + envelope | spawn/delegate → `terminate` → `followUp`/`continue` |

---

## 4. Mecanismos core que suelen escaparse

Ordenados por criticidad para extender sin romper.

### Tier 0 — Columna vertebral de sesión/turno

| # | Mecanismo | Path clave | Qué hace |
|---|---|---|---|
| 1 | **Session factory** | `core/session-manager.ts` | Bootstrap único: workspace, JSONL, prompts, tools, hooks, model, events. Key `username:sessionId`. Destroy = abort árbol + MCP + memory + rm dir |
| 2 | **metadata.json como SoT** | `session/metadata-store.ts` | `projectId/agentId/teamId/parentSessionId/tools/executionMode/autonomyLevel/permissionRules` + métricas. Decide tools, permisos, workspace |
| 3 | **Árbol JSONL / context rebuild** | `ai/session-persistence.ts` | Tree: message, compaction, branch_summary, model_change, thinking_level_change… `buildSessionContext` = lo que ve el modelo. Memoria del Agent **no** es durable |
| 4 | **steer / followUp / continue / abort** | `vendor/agent` + `agent-session` | Colas mid-run y post-run. Delegación completa con `followUp` + auto-`continue`. Abort hace fan-out recursivo |
| 5 | **Compaction** | `harness/compaction/*` + `AgentSession.compact` | Resume historia (`keepRecentTokens: 20k`, `reserve: 16k`). Entry `compaction` en el árbol. Manual, no auto cada turno |
| 6 | **convertToLlm + roles custom** | `ai/messages.ts` | `compactionSummary`, `branchSummary`, `custom`, `bashExecution` → user/assistant/toolResult. Roles desconocidos se dropean |

### Tier 1 — Seguridad, aislamiento, cancelación

| # | Mecanismo | Path clave | Qué hace |
|---|---|---|---|
| 7 | **Multi-tenant + auth en tools** | `user-config`, `paths.ts`, tool-factory | Todo namespaced por user. Keys/env/workspace por usuario. Tools cierran sobre `username/sessionId/cwd` |
| 8 | **Sandbox en capas** | `permission-engine`, `path-safety`, `bash-tool`, `bash-output-filter` | Deny estático → rules subagent → ASK → path escape block → bash PID/ports → scrub secretos en output |
| 9 | **AbortToken + árbol cancelación** | `abort-token.ts`, `delegation-registry.ts` | LIFO callbacks + BFS abort hijos. Restart marca delegaciones stale como `blocked` |
| 10 | **Herencia permisos subagent** | `subagent-permissions.ts`, `session-depth.ts` | Techo = tools del padre. Defaults niegan nest meta-tools. explorer/builder/autonomous. Depth vía `parentSessionId` |
| 11 | **Session prefixes** | `packages/shared/session-prefix.ts` | `sub_ del_ team_ lab_ exec_ bench_…` dictan layout FS, cleanup y permisos. No inventar IDs libres |

### Tier 2 — Contexto y tools runtime

| # | Mecanismo | Path clave | Qué hace |
|---|---|---|---|
| 12 | **Skills** | `load-skills.ts`, `resource-loader`, discovery en workspace | `SKILL.md` + frontmatter. Catálogo en system prompt; `/name` inyecta body del skill ese turno |
| 13 | **Memory** | `core/memory/*`, `session-memory-enricher` | SQLite+FTS5 por sesión (semantic/episodic/procedural) + tools. **Auto-inject es no-op** (`injectMemoryContext` desactivado) |
| 14 | **MCP** | `mcp-registry`, `mcp-client` | stdio/HTTP por user. Tools `mcp_{server}_{tool}` **async** tras crear sesión (race con primer prompt) |
| 15 | **Custom tools + pipelines in-tool** | `custom-tools/runtime.ts`, `pipeline-engine.ts` | type `pipeline` llama tools del session con `{vars}`, depth≤5. type `ui` = UI declarativa |
| 16 | **Task state** | `task-state-manager`, `decompose-tool` | `tasks.json` DAG por sesión. No reemplaza delegaciones; estructura blanda sobre el mismo loop |

### Tier 3 — Streaming y control

| # | Mecanismo | Path clave | Qué hace |
|---|---|---|---|
| 17 | **Event bus / WS** | `event-broker`, `session-event-publisher`, `ws/*` | loop events → AgentSession → broker → WS user/session/team. UI y teams dependen de esta cadena |
| 18 | **Usage / métricas** | metadata `computeAndPersistMetrics`, usage en assistant | Totales tokens/tools/errors en `agent_end`. No es billing ledger |
| 19 | **Queue modes + thinking** | `Agent` + tree entries | `steeringMode/followUpMode`: one-at-a-time \| all. Thinking/model persisten en JSONL tree |

### Tier 4 — Producto / side-effects (no kernel, pero reales)

| # | Mecanismo | Notas |
|---|---|---|
| 20 | **Image / video / vision** | APIs aparte del chat model; artifacts en `assets/generated` |
| 21 | **Preview builder/watcher** | `manage_preview` → build bash + FS watch + WS |
| 22 | **Teams orchestration** | Lead session `team_{id}` + prompts layered; reusa SessionManager, no otro kernel |
| 23 | **Factory tool** | `manage_factory` muta agents/projects/skills/teams/env |
| 24 | **Secrets** | AES-GCM env (`env-crypto`) + inject bash + redact output. Audit log **solo** env-access |
| 25 | **Scope** | `scope-config.json`: tools/agents por global/channel/project |

### Stubs / incompleto (no planear encima)

| Item | Estado |
|---|---|
| Auto-compaction cada turno | No; compact es API explícita |
| Memory auto-inject | Cableado pero **no-op** |
| Plugin/extensions API | `getExtensions()` vacío |
| Prompt cache OpenAI | Stub passthrough |
| `laboratory/*` (experiments) | Importado, **módulo ausente** |
| `pipelines/*` store/runner | `manage_pipelines` importa módulos **ausentes** |
| Audit full de tool calls | No existe |
| `navigateTree` + branch summary | Vendor sí; app solo `branch()` + reload |

---

## 5. Flujo de un mensaje (end-to-end)

```
POST/WS prompt
  → SessionManager.getOrCreateSession
  → (memory enrich wrap — inject hoy no-op)
  → AgentSession.prompt
       · parse /skill
       · rebuild systemPrompt (AGENTS.md + appends + skills)
       · reload messages desde JSONL tree
  → Agent.prompt → runAgentLoop
       · streamSimple (openai-completions)
       · por tool_call:
            beforeToolCall (autonomy → sandbox → approval?)
            execute
            afterToolCall  ← no cableado en app
       · prepareNextTurn (reload transcript + prompt)
       · drain steer / followUp
  → events → publisher → WS/SSE
  → message_end → append JSONL

Si tool = manage_delegations:
  crear child → registry → terminate:true
  async child.prompt
  complete → envelope → parent.followUp → parent.continue()
```

---

## 6. Resolución de modelos (hoy)

```
session context.model (JSONL)
  → agent definition.model
  → user default (primer available con key)
  → primer AvailableModel
```

No hay `project.defaultModel`. Delegate acepta `model?` one-shot.  
**Dualidad:** vendor `Models` casi muerto; app `ModelRegistry` + `compat.streamSimple` es el path real (9 providers → OpenAI-compatible).

---

## 7. System prompt (capas)

**Producto** (`assemblePromptAppends` + composer): env, AG-UI, memory instr, envelope delegación, project/team roster, MCP names, agent identity layers, factory prompt, task plan…

**Runtime** (`AgentSession`): `resourceLoader` (AGENTS.md) + appends + catálogo skills + bodies `/skill`.

Override ya existente: `{workspaceDir}/prompt-overrides.json`.

---

## 8. HITL

```
autonomy=suggest → block (salvo ask_question/request_approval)
permissionEngine → allow | deny | ask
autonomy=propose o ask → approvalManager.request (WS, timeout ~60s)
persist opcional → permission-decisions.json
```

Segunda vía: tools `request_approval` / `ask_question` (UI registry).

---

## 9. Workspace

Prioridad: override → team → project (arg o membership) → agent → user global.  
Subagentes: session dir bajo parent; **write sandbox hereda root parent**.  
Tools FS/bash con `cwd=workspaceDir`. Skills dirs como allowed extra.

**Inserción natural de config por workspace:** justo después de `resolveSessionWorkspace` en `getOrCreateSession`.

---

## 10. Delegaciones

| action | Efecto |
|---|---|
| `spawn` | `sub_{id}`, explorer/builder/autonomous, tools mínimos |
| `delegate` | `agent\|project\|team\|session` → `del_*` o team runner |

Depth + techo de tools del padre. Team hop no suma depth.  
Envelope (`shared/envelope.ts`): `status, executive_summary, artifacts, risks`.

Payload dinámico futuro: campo opcional `payload` → metadata → prompt child → envelope v2 `outputs` — **sin tocar el loop**.

---

## 11. Acoplamiento crítico

```
metadata.json
  → workspace-resolver | tool-activation | beforeToolCall
       → tool-factory | permissionEngine
            → manage_delegations
                 → getOrCreateSession | DelegationRegistry | prompts
                      → AgentSession → vendor loop
```

- Singletons: `sessionManager`, registries, `approvalManager`, `teamOrchestrator`, `eventBroker`
- **2 paths** de sesión: `getOrCreateSession` vs `createAgentServer` (toolsets distintos)
- Duplicado: session tree, convertToLlm, model catalog, listas de tools
- Tools de producto importan WS/singletons dentro de `execute`

---

## 12. Definición operativa de CORE

Es core si:

1. Interviene en cada turno, o  
2. Decide tools/modelo/prompt, o  
3. Puede bloquear side-effects (HITL/sandbox), o  
4. Crea/reanuda grafos de sesiones, o  
5. Define mensajes/eventos persistidos (JSONL tree)

Es host/producto: HTTP/WS, layout multi-tenant, UI, provider concreto, MCP server concreto, preview/gallery/factory UX.

### Runtime mínimo a extraer (SDK)

```
AgentLoop + AgentTool
before/afterToolCall
Model + StreamFn + ModelResolver
SessionStore (append / buildContext / compact)
SystemPromptBuilder
ToolRegistry + ActivationPolicy
PermissionPolicy
ApprovalPort
EventBus (AgentEvent tipado)
DelegationPort
WorkspaceContext (+ WorkspaceConfigPort)
Abort/Cancellation tree
```

### Host Spaces

```
Hono, WS, FS por user, env cifrado, MCP processes,
React UI, teams UX, preview, auth, backups
```

---

## 13. Frontera SDK propuesta

```
packages/sdk-core      # tipos + Zod (desde shared)
packages/sdk-runtime   # createAgentRuntime, hooks, session factory
packages/sdk-tools     # factories con Host inyectado
packages/sdk-providers # ProviderAdapter[]
apps/server            # host
```

```ts
interface SpacesHost {
  fs: WorkspaceFs;
  env: EnvStore;
  models: ModelRegistryPort;
  events: EventBus;
  approvals: ApprovalPort;
  delegations: DelegationPort;
  config: WorkspaceConfigPort;  // rules/skills/workflows por workspace
  memory?: MemoryPort;
  mcp?: McpPort;
  agents?: AgentDirectoryPort;
  teams?: TeamDirectoryPort;
  scope?: ScopePort;
}

createAgentRuntime({
  id, workspace, model, tools, systemPrompt,
  hooks?: { beforeToolCall?, afterToolCall? },
  persistence: SessionStore,
  host: SpacesHost,
}): AgentRuntime
```

Preferir **AgentHarness** (o Agent unificado) por debajo; dejar de deep-importar `vendor/*/src`.

---

## 14. Plan de extracción (bajo riesgo)

| Fase | Qué | Para qué |
|---|---|---|
| **0** Contratos | Events tipados; catálogo tools único; `resolveModel` único; cablear `afterToolCall` | Congelar bordes |
| **1** Puertos | `SpacesHost` en tool factories; `DelegationService` fuera del tool; `WorkspaceConfig` loader (aunque solo lea AGENTS + overrides) | Sin cambiar UX |
| **2** Runtime pkg | `createAgentRuntime`; unificar SessionStore; migrar AgentSession | Frontera publicable |
| **3** Features | `.spaces/config` por workspace; model cascade entity; delegation `payload`; workflows | Sobre suelo firme |

### Cómo caen tus ejemplos futuros

| Feature | Puerto | Enganche hoy |
|---|---|---|
| Config workspace (rules/skills/workflows) | `WorkspaceConfigPort` | post-`resolveSessionWorkspace` |
| Payload dinámico delegación | `DelegationPort` + envelope v2 | `manage-delegations-tool` |
| Modelos por agente/proyecto | `ModelResolver` | session-manager + agent-server + delegations |
| Policies por workspace | merge en `PermissionPolicy` | permission-engine / subagent rules |

---

## 15. Riesgos si se extiende sin SDK

| Acción precipitada | Riesgo |
|---|---|
| Config workspace solo en session-manager | Teams/agents/delegates no la cargan |
| Model-per-project solo en UI | spawn/delegate siguen con parent model |
| Ampliar delegación sin versionar envelope | Padres no parsean; loops colgados |
| Tools nuevas con más singletons | Intestable; multi-runtime imposible |
| Fork del loop por hooks | Dos loops; pierdes upgrades vendor |
| Asumir memory auto-inject o pipelines/lab | Código no-op o módulos ausentes |

---

## 16. Orden para entender el código

1. `session-manager` + `metadata.json` + prefixes  
2. JSONL tree + `buildSessionContext` + `convertToLlm`  
3. Loop + steer/followUp/continue + `prepareNextTurn`  
4. `beforeToolCall` + subagent rules + path/bash safety  
5. Abort/delegation tree  
6. Compaction entries  
7. WS/event chain  
8. Luego: skills, MCP, custom-tools, memory tools, media, preview, factory, teams  

**Blind spots si solo miraste loop/models/prompts/hooks/workspace/HITL/tools/delegations:**  
metadata SoT · session tree/compaction · steer/followUp auto-continue · prepareNextTurn reload disco · herencia techo subagent · cancelación BFS · memory inject no-op · pipelines/lab rotos.

---

## 17. Índice de archivos

```
# Vendor
ai/vendor/agent/src/agent-loop.ts
ai/vendor/agent/src/agent.ts
ai/vendor/agent/src/types.ts
ai/vendor/agent/src/harness/agent-harness.ts
ai/vendor/agent/src/harness/compaction/*
ai/vendor/ai/src/compat.ts

# App AI
ai/agent-session.ts
ai/model-registry.ts
ai/session-persistence.ts
ai/resource-loader.ts
ai/messages.ts
ai/load-skills.ts

# Product core
core/session-manager.ts
core/session/workspace-resolver.ts
core/session/prompt-builder.ts
core/session/tool-factory.ts
core/session/tool-activation-engine.ts
core/session/before-tool-call-hook.ts
core/session/metadata-store.ts
core/session/user-config.ts
core/session/session-depth.ts
core/session/session-event-publisher.ts
core/tools/manage-delegations-tool.ts
core/delegation-registry.ts
core/abort-token.ts
core/agent-utils.ts
core/approvals/approval-manager.ts
core/sandbox/*
core/prompts/*
core/memory/*
core/mcp-*.ts
core/custom-tools/*
core/scope/scope-config-manager.ts

# Shared
packages/shared/src/{schemas,envelope,session-prefix,paths}.ts
```

---

## 18. Conclusión

El core **es** tu mapa (loop, modelos, prompts, hooks, workspace, HITL, tools, delegaciones) **más**:

- **metadata + JSONL tree** (fuente de verdad de contexto)
- **steer/followUp/continue/abort trees**
- **compaction + convertToLlm**
- **sandbox multicapa + herencia subagent + prefixes**
- **skills / MCP async / custom-tool pipelines**
- **event bus WS**
- **ModelResolver y Session factory únicos** (hoy fragmentados)

Moverse a un **Runtime SDK con Host ports** es el prerrequisito para:

1. config por workspace al instanciar sesión  
2. payloads dinámicos de delegación  
3. modelos persistentes por entidad  

sin romper lo que ya corre.
