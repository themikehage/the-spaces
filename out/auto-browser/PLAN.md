# Auto-Browser — Plan de Arquitectura MVP

> Motor de agentes extensible y desacoplado desde el día 0. Chat + sesiones como superficie mínima, arquitectura limpia para escalar a producción.

---

## Tabla de Contenidos

1. [Visión y Alcance](#1-visión-y-alcance)
2. [Principios de Arquitectura Innegociables](#2-principios-de-arquitectura-innegociables)
3. [Estructura de Paquetes](#3-estructura-de-paquetes)
4. [Diseño Detallado del Core](#4-diseño-detallado-del-core)
5. [Plan de Implementación por Fases](#5-plan-de-implementación-por-fases)
6. [Contratos de Paquete (Interfaces)](#6-contratos-de-paquete-interfaces)
7. [Estrategia de Extensión Futura](#7-estrategia-de-extensión-futura)
8. [Estrategia de Migración desde the-spaces](#8-estrategia-de-migración-desde-the-spaces)
9. [Riesgos y Decisiones](#9-riesgos-y-decisiones)

---

## 1. Visión y Alcance

### Qué es Auto-Browser

Un motor de agentes de IA con interfaz de chat. El agente es la **entidad de primer orden** del sistema. Todo lo demás (tools, skills, hooks, rules, permisos, sandbox, workspaces, memoria) son módulos que se **componen sobre el agente** sin modificar su núcleo.

### MVP (Fase 1)

| Feature      | Alcance                                          |
| ------------ | ------------------------------------------------ |
| Chat con AI  | Streaming de mensajes vía WebSocket              |
| Sesiones     | CRUD mínimo (crear, listar, eliminar)            |
| Agente único | Runtime con modelo configurable y tools mínimas  |
| Persistencia | Archivos JSONL por sesión                        |
| UI           | React mínimo: sidebar de sesiones + área de chat |

### Lo que NO está en el MVP

Proyectos, equipos, subagentes, delegaciones, MCP, memoria vectorial, custom tools, skills, plugins, approvals, schedules, sandbox avanzado, cascade config, compaction, branch navigation, task runner, i18n, mobile, archiving, export.

**Pero la arquitectura lo soporta desde el día 0 sin reescribir el core.**

---

## 2. Principios de Arquitectura Innegociables

### 2.1 El Agente es Composición, no God Object

Nada de clases monolíticas. `AgentRuntime` es una **interfaz fina** que recibe sus dependencias por constructor:

```
AgentRuntime
├── IModelProvider       (estrategia: OpenAI, Anthropic, etc.)
├── IToolExecutor        (registry + execution + sandbox)
├── IPromptBuilder       (pipeline de secciones componibles)
├── IHookRunner          (middleware chain: before/after prompt, tool call, error)
├── IPermissionEngine    (rules declarativas → allow/deny)
├── ISessionStore        (persistencia, swappeable)
├── IMemoryProvider      (contexto extendido, opcional)
└── EventBus             (pub/sub interno)
```

Cada módulo es una **interfaz en `core/ports/`** → **implementación en su paquete** → **testeable aisladamente**. El agente no sabe _cómo_ se hace nada, solo orquesta el loop.

### 2.2 Tipos de Agente como Fábricas, no como Herencia

Nada de `class ProjectAgent extends BaseAgent`. Los tipos (global, project, team) son **composiciones pre-armadas** que devuelve una factory:

```ts
// El agente es siempre la misma clase, lo que cambia es qué se le inyecta
createGlobalAgent(cfg)   → new AgentRuntime({ tools: defaultTools, hooks: [] })
createProjectAgent(cfg)  → new AgentRuntime({ tools: [...defaultTools, ...projectTools], sandbox: workspaceDir })
createTeamAgent(cfg)     → new AgentRuntime({ tools: teamTools, hooks: [delegationHook, consensusHook] })
```

Cuando aparezca un nuevo tipo en el futuro, solo se crea una nueva factory. El core de `AgentRuntime` no se toca.

### 2.3 Prompt Pipeline Componible (Secciones por Prioridad)

El system prompt no se arma con lógica spaghetti. Es un pipeline de secciones ordenadas por prioridad:

```ts
interface PromptSection {
  id: string;
  priority: number; // orden de ensamblado (menor = primero)
  condition?: (ctx: AgentContext) => boolean;
  render(ctx: AgentContext): Promise<string>;
}

// Secciones built-in con prioridades fijas:
//  0: SystemIdentity   ("You are a helpful agent...")
// 10: Rules            (reglas del agente/proyecto)
// 20: Context          (workspace path, git status, etc.)
// 30: Memory           (memorias recuperadas)
// 40: Tools            (descripción de herramientas disponibles)
// 50: Format           (formato de output esperado)
```

Agregar un skill, una regla, o contexto nuevo = registrar una sección más con la prioridad adecuada. El pipeline no cambia.

### 2.4 Hooks como Middleware Chain

No callbacks sueltos. Una cadena de middleware con capacidad de short-circuit:

```ts
interface Hook {
  id: string;
  priority: number;

  beforePrompt?(ctx: PromptContext): Promise<PromptContext>;
  afterPrompt?(result: PromptResult): Promise<PromptResult>;
  beforeToolCall?(ctx: ToolCallContext): Promise<ToolCallContext | null>; // null = block
  afterToolCall?(ctx: ToolCallContext, result: ToolResult): Promise<ToolResult>;
  onError?(error: AgentError): Promise<void>;
}
```

El `HookRunner` los ejecuta en orden de prioridad. Un hook puede devolver `null` en `beforeToolCall` para bloquear. Esto habilita: logging, audit, sandbox enforcement, rate limiting, approval UI — todo como hooks enchufables sin tocar el core.

### 2.5 Rules como Constraints Declarativos

Separados de los hooks. Los hooks son _imperativos_ (hacen cosas), las rules son _declarativas_ (permiten o deniegan):

```ts
interface Rule {
  id: string;
  description: string;
  evaluate(ctx: RuleContext): { allowed: boolean; reason?: string };
}
```

El `PermissionEngine` evalúa todas las rules antes de cada tool call. Si una deniega, la herramienta no se ejecuta. Las rules se pueden cargar desde archivos `.rules/` en el workspace.

### 2.6 Tool Registry como Contrato Tipado

Las tools son ciudadanos de primera clase con contrato explícito:

```ts
interface ITool {
  name: string;
  description: string;
  parameters: ZodSchema;
  category?: string;
  requiresApproval?: boolean;
  execute(args: unknown, ctx: ToolContext): Promise<ToolResult>;
}

interface IToolRegistry {
  register(tool: ITool): void;
  get(name: string): ITool | undefined;
  list(filter?: { category?: string }): ITool[];
  toLLMFormat(): LLMToolDefinition[];
}
```

### 2.7 Sandbox y Workspace como Dependencias Inyectables

El agente no sabe si ejecuta en local, Docker, o remoto:

```ts
interface ISandbox {
  execute(cmd: string, opts?: SandboxOptions): Promise<SandboxResult>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(pattern: string): Promise<string[]>;
}

interface IWorkspaceProvider {
  resolvePath(relativePath: string): string;
  watch(pattern: string, onChange: () => void): () => void;
  sync(remote: WorkspaceSyncTarget): Promise<void>;
}
```

### 2.8 Reglas de Integridad del Código

| Regla                                 | Razón                                                       |
| ------------------------------------- | ----------------------------------------------------------- |
| Ninguna clase > 200 líneas            | Si crece, se parte en submódulos                            |
| Ningún singleton                      | Todo se inyecta por constructor o context object            |
| Ningún `any`                          | TypeScript strict mode desde el día 0                       |
| Ninguna dependencia circular          | Interfaces en `core/ports/`, implementaciones en su paquete |
| Ningún hardcodeo de providers/tools   | Todo se registra, nada se importa directamente en el core   |
| Schemas co-localizados con su dominio | Nada de archivos de schemas monolíticos de 900 líneas       |

---

## 3. Estructura de Paquetes

```
auto-browser/
├── pnpm-workspace.yaml
├── package.json                  (workspace root)
├── turbo.json
├── tsconfig.base.json
│
├── packages/
│   ├── core/                     # Interfaces puras, cero implementaciones
│   │   ├── package.json          # name: @auto-browser/core
│   │   └── src/
│   │       ├── index.ts          # barrel export
│   │       ├── ports/
│   │       │   ├── agent.port.ts         # IAgentRuntime
│   │       │   ├── model.port.ts         # IModelProvider
│   │       │   ├── tool.port.ts          # ITool, IToolRegistry, IToolExecutor
│   │       │   ├── prompt.port.ts        # IPromptBuilder, PromptSection
│   │       │   ├── hook.port.ts          # Hook, IHookRunner
│   │       │   ├── permission.port.ts    # IPermissionEngine, Rule
│   │       │   ├── session.port.ts       # ISessionStore, SessionData, MessageRecord
│   │       │   ├── sandbox.port.ts       # ISandbox
│   │       │   ├── workspace.port.ts     # IWorkspaceProvider
│   │       │   ├── memory.port.ts        # IMemoryProvider
│   │       │   └── event-bus.port.ts     # IEventBus, AgentEvent
│   │       ├── events.ts         # Tipos de eventos del bus
│   │       ├── types.ts          # AgentContext, ToolContext, PromptContext, etc.
│   │       └── schemas/          # Schemas Zod del core (mínimos, por dominio)
│   │           ├── session.schema.ts
│   │           ├── message.schema.ts
│   │           └── tool.schema.ts
│   │
│   ├── engine/                   # Implementación del runtime
│   │   ├── package.json          # name: @auto-browser/engine, depends: core
│   │   └── src/
│   │       ├── index.ts
│   │       ├── agent-runtime.ts      # AgentRuntime (compone todas las dependencias)
│   │       ├── agent-loop.ts         # Loop LLM → tool calls → LLM (extraído del vendor)
│   │       ├── tool-executor.ts      # IToolExecutor: registry + execute con hooks
│   │       ├── prompt-builder.ts     # IPromptBuilder: pipeline de PromptSection[]
│   │       ├── hook-runner.ts        # IHookRunner: middleware chain
│   │       ├── permission-engine.ts  # IPermissionEngine: evaluador de rules
│   │       ├── event-bus.ts          # IEventBus: implementación con Emittery
│   │       └── factories/
│   │           ├── default.agent.ts  # createAgent(config) → AgentRuntime
│   │           └── index.ts
│   │
│   ├── tools/                    # Implementaciones de ITool
│   │   ├── package.json          # name: @auto-browser/tools, depends: core
│   │   └── src/
│   │       ├── index.ts          # barrel + registry pre-poblado
│   │       ├── bash.tool.ts
│   │       ├── read.tool.ts
│   │       ├── write.tool.ts
│   │       ├── edit.tool.ts
│   │       ├── glob.tool.ts
│   │       ├── grep.tool.ts
│   │       ├── webfetch.tool.ts
│   │       └── task.tool.ts      # sub-task tool (para después)
│   │
│   ├── providers/                # Implementaciones de IModelProvider
│   │   ├── package.json          # name: @auto-browser/providers
│   │   └── src/
│   │       ├── index.ts
│   │       ├── openai-compatible.ts  # Funciona con OpenAI, Groq, DeepSeek, etc.
│   │       └── provider-registry.ts  # Registro de providers disponibles
│   │
│   ├── sandbox/                  # Implementaciones de ISandbox
│   │   ├── package.json          # name: @auto-browser/sandbox
│   │   └── src/
│   │       ├── index.ts
│   │       ├── local.sandbox.ts       # child_process local
│   │       └── restricted-paths.ts   # paths bloqueados del sistema
│   │
│   └── storage/                  # Implementaciones de ISessionStore
│       ├── package.json          # name: @auto-browser/storage
│       └── src/
│           ├── index.ts
│           ├── memory.store.ts        # En memoria (tests/dev)
│           └── filesystem.store.ts    # JSONL en disco (producción)
│
├── apps/
│   ├── server/                   # Hono server mínimo (REST + WS)
│   │   ├── package.json          # name: @auto-browser/server
│   │   └── src/
│   │       ├── index.ts          # Entry point: Hono app + Bun.serve
│   │       ├── routes/
│   │       │   ├── sessions.ts    # POST /sessions, GET /sessions, DELETE /sessions/:id
│   │       │   └── health.ts      # GET /health
│   │       ├── ws/
│   │       │   └── handler.ts     # WebSocket handler: prompt, subscribe, abort
│   │       ├── context.ts         # AppContext (DI container mínimo)
│   │       └── config.ts          # Server config desde env
│   │
│   └── client/                   # React chat UI mínimo
│       ├── package.json          # name: @auto-browser/client
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── api/
│           │   ├── client.ts          # fetch wrapper (apiFetch)
│           │   └── ws.ts              # WebSocket client con reconexión
│           ├── hooks/
│           │   ├── useWebSocket.ts     # Hook de React para WS
│           │   ├── useChat.ts          # Estado del chat (messages, streaming)
│           │   └── useSessions.ts      # CRUD de sesiones
│           ├── components/
│           │   ├── Layout.tsx          # Shell mínimo (header + sidebar + main)
│           │   ├── SessionList.tsx     # Sidebar con lista de sesiones
│           │   ├── ChatArea.tsx        # Área principal del chat
│           │   ├── MessageList.tsx     # Lista de mensajes con streaming
│           │   ├── ChatInput.tsx       # Input de texto + botón enviar/stop
│           │   ├── MessageBubble.tsx   # Burbuja de mensaje (user/assistant)
│           │   └── Markdown.tsx        # Renderizado de markdown
│           └── styles/
│               └── index.css           # Tailwind CSS v4
│
└── out/                          # Build artifacts (gitignored)
```

---

## 4. Diseño Detallado del Core

### 4.1 AgentRuntime — El Corazón

```ts
// packages/core/src/ports/agent.port.ts

interface IAgentRuntime {
  readonly id: string;
  readonly events: IEventBus<AgentEvent>;

  prompt(message: string, opts?: PromptOptions): Promise<void>;
  abort(): Promise<void>;
  dispose(): Promise<void>;

  getMessages(): AgentMessage[];
  getContextUsage(): ContextUsage;
}

// packages/core/src/ports/agent.port.ts

interface AgentRuntimeDependencies {
  modelProvider: IModelProvider;
  toolExecutor: IToolExecutor;
  promptBuilder: IPromptBuilder;
  hookRunner: IHookRunner;
  permissionEngine: IPermissionEngine;
  sessionStore: ISessionStore;
  memoryProvider?: IMemoryProvider;
}
```

```ts
// packages/engine/src/agent-runtime.ts

class AgentRuntime implements IAgentRuntime {
  readonly id: string;
  readonly events = new EventBus<AgentEvent>();

  private deps: AgentRuntimeDependencies;
  private messages: AgentMessage[] = [];
  private abortController: AbortController | null = null;
  private streaming = false;

  constructor(id: string, deps: AgentRuntimeDependencies) {
    this.id = id;
    this.deps = deps;
    this.loadHistory();
  }

  async prompt(input: string, opts?: PromptOptions): Promise<void> {
    if (this.streaming) throw new AgentError("Agent is already streaming");

    this.abortController = new AbortController();
    this.streaming = true;
    this.events.emit({ type: "agent_start" });

    try {
      const userMsg = { role: "user" as const, content: input, id: crypto.randomUUID() };
      this.messages.push(userMsg);
      await this.deps.sessionStore.appendMessage(this.id, userMsg);

      const systemPrompt = await this.deps.promptBuilder.build(this.getContext());
      const llmMessages = this.buildLLMMessages(systemPrompt);
      const toolDefs = this.deps.toolExecutor.getRegistry().toLLMFormat();

      await runAgentLoop({
        modelProvider: this.deps.modelProvider,
        messages: llmMessages,
        tools: toolDefs,
        systemPrompt,
        signal: this.abortController.signal,
        onMessageStart: (msg) => {
          this.messages.push(msg);
          this.events.emit({ type: "message_start", message: msg });
        },
        onMessageUpdate: (msg, delta) => {
          this.events.emit({ type: "message_update", message: msg, delta });
        },
        onMessageEnd: async (msg) => {
          await this.deps.sessionStore.appendMessage(this.id, msg);
          this.events.emit({ type: "message_end", message: msg });
        },
        onToolCall: async (toolCall) => {
          const allowed = await this.deps.permissionEngine.evaluate(toolCall);
          if (!allowed) throw new AgentError(`Tool ${toolCall.name} blocked by permissions`);

          const ctx = await this.deps.hookRunner.runBeforeToolCall(toolCall);
          if (!ctx) return; // hook bloqueó

          this.events.emit({ type: "tool_execution_start", toolCall });

          const result = await this.deps.toolExecutor.execute(toolCall);
          const finalResult = await this.deps.hookRunner.runAfterToolCall(toolCall, result);

          this.events.emit({ type: "tool_execution_end", toolCall, result: finalResult });
          return finalResult;
        },
      });
    } catch (err) {
      await this.deps.hookRunner.runOnError(err);
      this.events.emit({ type: "agent_error", error: err.message });
    } finally {
      this.streaming = false;
      this.events.emit({ type: "agent_end", messages: this.messages });
    }
  }

  abort(): Promise<void> {
    this.abortController?.abort();
    return Promise.resolve();
  }

  dispose(): Promise<void> {
    this.abort();
    this.events.clear();
    return Promise.resolve();
  }

  getMessages(): AgentMessage[] {
    return this.messages;
  }
  getContextUsage(): ContextUsage {
    /* token estimation */ return { used: 0, total: 0 };
  }

  private loadHistory(): void {
    this.messages = this.deps.sessionStore.getMessages(this.id);
  }

  private buildLLMMessages(systemPrompt: string): LLMMessage[] {
    return [
      { role: "system", content: systemPrompt },
      ...this.messages.map((m) => ({ role: m.role, content: m.content })),
    ];
  }

  private getContext(): AgentContext {
    return { sessionId: this.id, messages: this.messages };
  }
}
```

### 4.2 Agent Loop (Extraído del Vendor de the-spaces)

```ts
// packages/engine/src/agent-loop.ts

interface AgentLoopConfig {
  modelProvider: IModelProvider;
  messages: LLMMessage[];
  tools: LLMToolDefinition[];
  systemPrompt: string;
  signal: AbortSignal;
  maxIterations?: number; // default: 25
  onMessageStart: (msg: AgentMessage) => void;
  onMessageUpdate: (msg: AgentMessage, delta: MessageDelta) => void;
  onMessageEnd: (msg: AgentMessage) => Promise<void>;
  onToolCall: (toolCall: ToolCall) => Promise<ToolResult>;
}

async function runAgentLoop(config: AgentLoopConfig): Promise<void> {
  let iterations = 0;
  const maxIter = config.maxIterations ?? 25;

  while (iterations < maxIter) {
    if (config.signal.aborted) throw new AgentError("Aborted");

    const assistantMsg: AgentMessage = { role: "assistant", content: [] };
    config.onMessageStart(assistantMsg);

    await config.modelProvider.streamComplete({
      messages: config.messages,
      tools: config.tools,
      system: config.systemPrompt,
      signal: config.signal,
      onDelta: (delta) => {
        // Merge delta into assistantMsg.content
        config.onMessageUpdate(assistantMsg, delta);
      },
    });

    await config.onMessageEnd(assistantMsg);
    config.messages.push({ role: "assistant", content: assistantMsg.content });

    const toolCalls = extractToolCalls(assistantMsg);
    if (toolCalls.length === 0) break;

    for (const toolCall of toolCalls) {
      const result = await config.onToolCall(toolCall);
      config.messages.push({
        role: "tool",
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      });
    }

    iterations++;
  }
}
```

### 4.3 Prompt Builder — Pipeline de Secciones

```ts
// packages/engine/src/prompt-builder.ts

class PromptBuilder implements IPromptBuilder {
  private sections: PromptSection[] = [];

  registerSection(section: PromptSection): void {
    this.sections.push(section);
    this.sections.sort((a, b) => a.priority - b.priority);
  }

  async build(ctx: AgentContext): Promise<string> {
    const parts: string[] = [];
    for (const section of this.sections) {
      if (section.condition && !section.condition(ctx)) continue;
      const rendered = await section.render(ctx);
      if (rendered) parts.push(rendered);
    }
    return parts.join("\n\n");
  }
}
```

### 4.4 Hook Runner — Middleware Chain

```ts
// packages/engine/src/hook-runner.ts

class HookRunner implements IHookRunner {
  private hooks: Hook[] = [];

  register(hook: Hook): void {
    this.hooks.push(hook);
    this.hooks.sort((a, b) => a.priority - b.priority);
  }

  async runBeforeToolCall(ctx: ToolCallContext): Promise<ToolCallContext | null> {
    let current = ctx;
    for (const hook of this.hooks) {
      if (!hook.beforeToolCall) continue;
      const result = await hook.beforeToolCall(current);
      if (result === null) return null; // hook bloqueó
      current = result;
    }
    return current;
  }

  async runAfterToolCall(ctx: ToolCallContext, result: ToolResult): Promise<ToolResult> {
    let current = result;
    for (const hook of this.hooks) {
      if (!hook.afterToolCall) continue;
      current = await hook.afterToolCall(ctx, current);
    }
    return current;
  }

  async runOnError(error: Error): Promise<void> {
    const agentError = error instanceof AgentError ? error : new AgentError(error.message);
    for (const hook of this.hooks) {
      if (!hook.onError) continue;
      await hook.onError(agentError);
    }
  }
}
```

### 4.5 Event Bus

```ts
// packages/core/src/ports/event-bus.port.ts

interface IEventBus<T extends Record<string, unknown>> {
  emit<E extends keyof T>(event: T[E]): void;
  on<E extends keyof T>(type: E, handler: (event: T[E]) => void): () => void;
  clear(): void;
}

// Tipos de eventos
type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: AgentMessage[] }
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AgentMessage; delta: MessageDelta }
  | { type: "message_end"; message: AgentMessage }
  | { type: "tool_execution_start"; toolCall: ToolCall }
  | { type: "tool_execution_end"; toolCall: ToolCall; result: ToolResult }
  | { type: "agent_error"; error: string };
```

### 4.6 Server — Hono Mínimo

```ts
// apps/server/src/index.ts

import { Hono } from "hono";
import { cors } from "hono/cors";
import { createBunWebSocket } from "hono/bun";

const app = new Hono();
app.use("/*", cors({ origin: "*", credentials: true }));

const { upgradeWebSocket, websocket } = createBunWebSocket();

// REST: Sesiones
app.post("/sessions", async (c) => {
  const sessionId = crypto.randomUUID();
  const ctx = await createAppContext();
  const agent = createAgent({
    id: sessionId,
    modelProvider: ctx.modelProvider,
    sessionStore: ctx.sessionStore,
    // ... resto de dependencias
  });
  ctx.agentCache.set(sessionId, agent);
  return c.json({ id: sessionId, name: "New Session", createdAt: new Date().toISOString() });
});

app.get("/sessions", async (c) => {
  return c.json(ctx.sessionStore.listSessions());
});

app.delete("/sessions/:id", async (c) => {
  const id = c.req.param("id");
  ctx.agentCache.get(id)?.dispose();
  ctx.agentCache.delete(id);
  await ctx.sessionStore.delete(id);
  return c.json({ ok: true });
});

// WebSocket: Chat streaming
app.get(
  "/ws",
  upgradeWebSocket((c) => ({
    onOpen(_, ws) {
      const sessionId = new URL(c.req.url).searchParams.get("sessionId");
      if (!sessionId) {
        ws.close();
        return;
      }

      const agent = ctx.agentCache.get(sessionId);
      if (!agent) {
        ws.close();
        return;
      }

      // Forward agent events to WS client
      const unsub = agent.events.on("*", (event) => {
        ws.send(JSON.stringify(event));
      });

      ws.raw.addEventListener("message", async (e) => {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "prompt") {
          await agent.prompt(msg.message);
        } else if (msg.type === "abort") {
          await agent.abort();
        }
      });

      ws.raw.addEventListener("close", () => unsub());
    },
  })),
);

export default {
  fetch: app.fetch,
  websocket,
};
```

---

## 5. Plan de Implementación por Fases

### Fase 0: Setup del Monorepo (2h)

| #   | Tarea                                                                                                 | Archivo(s)            | Esfuerzo |
| --- | ----------------------------------------------------------------------------------------------------- | --------------------- | -------- |
| 0.1 | Crear `pnpm-workspace.yaml` apuntando a `apps/*` y `packages/*`                                       | `pnpm-workspace.yaml` | 5 min    |
| 0.2 | Crear `package.json` raíz con scripts `dev`, `build`, `typecheck`                                     | `package.json`        | 10 min   |
| 0.3 | Crear `tsconfig.base.json` con strict mode, paths, target ES2022                                      | `tsconfig.base.json`  | 15 min   |
| 0.4 | Crear `turbo.json` con pipeline `build`, `typecheck`, `dev`                                           | `turbo.json`          | 10 min   |
| 0.5 | Crear `.editorconfig`, `.prettierrc`, `eslint.config.mjs` (flat config)                               | Varios                | 20 min   |
| 0.6 | Crear `package.json` para cada paquete (`core`, `engine`, `tools`, `providers`, `sandbox`, `storage`) | 6 × `package.json`    | 30 min   |
| 0.7 | Crear `package.json` para `apps/server` y `apps/client`                                               | 2 × `package.json`    | 15 min   |
| 0.8 | `pnpm install` y verificar que todos los workspaces se resuelven                                      | —                     | 15 min   |

### Fase 1: Core — Interfaces Puras (4h)

| #    | Tarea                                                                                                      | Archivo(s)                                                | Esfuerzo |
| ---- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------- |
| 1.1  | Definir tipos base: `AgentMessage`, `LLMMessage`, `ToolCall`, `ToolResult`, `MessageDelta`, `ContextUsage` | `packages/core/src/types.ts`                              | 30 min   |
| 1.2  | Definir `AgentContext`, `ToolContext`, `PromptContext`, `RuleContext`                                      | `packages/core/src/types.ts`                              | 20 min   |
| 1.3  | Definir `IEventBus<T>` interface + `AgentEvent` union type                                                 | `packages/core/src/ports/event-bus.port.ts` + `events.ts` | 30 min   |
| 1.4  | Definir `IModelProvider` interface (con `streamComplete`)                                                  | `packages/core/src/ports/model.port.ts`                   | 20 min   |
| 1.5  | Definir `ITool`, `IToolRegistry`, `IToolExecutor`, `LLMToolDefinition`                                     | `packages/core/src/ports/tool.port.ts`                    | 30 min   |
| 1.6  | Definir `PromptSection`, `IPromptBuilder`                                                                  | `packages/core/src/ports/prompt.port.ts`                  | 15 min   |
| 1.7  | Definir `Hook`, `IHookRunner`                                                                              | `packages/core/src/ports/hook.port.ts`                    | 15 min   |
| 1.8  | Definir `Rule`, `IPermissionEngine`                                                                        | `packages/core/src/ports/permission.port.ts`              | 15 min   |
| 1.9  | Definir `ISessionStore` (create, appendMessage, getMessages, listSessions, delete)                         | `packages/core/src/ports/session.port.ts`                 | 20 min   |
| 1.10 | Definir `ISandbox`, `SandboxOptions`, `SandboxResult`                                                      | `packages/core/src/ports/sandbox.port.ts`                 | 15 min   |
| 1.11 | Definir `IWorkspaceProvider`                                                                               | `packages/core/src/ports/workspace.port.ts`               | 10 min   |
| 1.12 | Definir `IMemoryProvider` (stub para futuro)                                                               | `packages/core/src/ports/memory.port.ts`                  | 10 min   |
| 1.13 | Definir `IAgentRuntime` + `AgentRuntimeDependencies`                                                       | `packages/core/src/ports/agent.port.ts`                   | 15 min   |
| 1.14 | Definir schemas Zod: `SessionSchema`, `CreateSessionSchema`, `MessageSchema`, `ToolCallSchema`             | `packages/core/src/schemas/`                              | 30 min   |
| 1.15 | Barrel export `packages/core/src/index.ts`                                                                 | `packages/core/src/index.ts`                              | 10 min   |

### Fase 2: Engine — Implementación del Runtime (6h)

| #   | Tarea                                                                   | Archivo(s)                                       | Esfuerzo |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------ | -------- |
| 2.1 | Implementar `EventBus` (wrapper sobre Emittery o implementación propia) | `packages/engine/src/event-bus.ts`               | 45 min   |
| 2.2 | Implementar `PromptBuilder` con pipeline de secciones                   | `packages/engine/src/prompt-builder.ts`          | 1h       |
| 2.3 | Implementar `HookRunner` (middleware chain con short-circuit)           | `packages/engine/src/hook-runner.ts`             | 1h       |
| 2.4 | Implementar `PermissionEngine` (evaluador de rules)                     | `packages/engine/src/permission-engine.ts`       | 45 min   |
| 2.5 | Implementar `ToolExecutor` (registry + execute con hooks y permisos)    | `packages/engine/src/tool-executor.ts`           | 1h       |
| 2.6 | Implementar `AgentRuntime` (compone todo, implementa `IAgentRuntime`)   | `packages/engine/src/agent-runtime.ts`           | 2h       |
| 2.7 | Extraer `runAgentLoop` del vendor de the-spaces y adaptarlo             | `packages/engine/src/agent-loop.ts`              | 2h       |
| 2.8 | Implementar `createAgent()` factory con defaults                        | `packages/engine/src/factories/default.agent.ts` | 1h       |
| 2.9 | Barrel export                                                           | `packages/engine/src/index.ts`                   | 10 min   |

### Fase 3: Providers — OpenAI-Compatible (2h)

| #   | Tarea                                                                                         | Archivo(s)                                    | Esfuerzo |
| --- | --------------------------------------------------------------------------------------------- | --------------------------------------------- | -------- |
| 3.1 | Implementar `OpenAICompatibleProvider` (usa fetch a `/v1/chat/completions` con streaming SSE) | `packages/providers/src/openai-compatible.ts` | 2h       |
| 3.2 | Implementar `ProviderRegistry` (mapa de provider por nombre)                                  | `packages/providers/src/provider-registry.ts` | 30 min   |
| 3.3 | Barrel export                                                                                 | `packages/providers/src/index.ts`             | 10 min   |

### Fase 4: Tools — Implementaciones Básicas (2h)

| #   | Tarea                                                           | Archivo(s)                            | Esfuerzo |
| --- | --------------------------------------------------------------- | ------------------------------------- | -------- |
| 4.1 | Implementar `read` tool (lee archivo del filesystem)            | `packages/tools/src/read.tool.ts`     | 20 min   |
| 4.2 | Implementar `write` tool (escribe archivo)                      | `packages/tools/src/write.tool.ts`    | 20 min   |
| 4.3 | Implementar `edit` tool (replace in file)                       | `packages/tools/src/edit.tool.ts`     | 25 min   |
| 4.4 | Implementar `glob` tool (pattern matching)                      | `packages/tools/src/glob.tool.ts`     | 15 min   |
| 4.5 | Implementar `grep` tool (content search)                        | `packages/tools/src/grep.tool.ts`     | 15 min   |
| 4.6 | Implementar `bash` tool (shell commands)                        | `packages/tools/src/bash.tool.ts`     | 25 min   |
| 4.7 | Implementar `webfetch` tool (HTTP requests)                     | `packages/tools/src/webfetch.tool.ts` | 20 min   |
| 4.8 | `DefaultToolRegistry`: registry pre-poblado con todas las tools | `packages/tools/src/index.ts`         | 15 min   |

### Fase 5: Storage (1h 30m)

| #   | Tarea                                                     | Archivo(s)                                 | Esfuerzo |
| --- | --------------------------------------------------------- | ------------------------------------------ | -------- |
| 5.1 | Implementar `MemorySessionStore` (en memoria, para tests) | `packages/storage/src/memory.store.ts`     | 30 min   |
| 5.2 | Implementar `FilesystemSessionStore` (JSONL en disco)     | `packages/storage/src/filesystem.store.ts` | 1h       |

### Fase 6: Server — Hono + WebSocket (3h)

| #   | Tarea                                                                                    | Archivo(s)                           | Esfuerzo |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------ | -------- |
| 6.1 | Crear `AppContext` (DI container: modelProvider, sessionStore, agentCache, toolRegistry) | `apps/server/src/context.ts`         | 30 min   |
| 6.2 | Crear `config.ts` (API keys desde env, defaults)                                         | `apps/server/src/config.ts`          | 20 min   |
| 6.3 | Implementar `POST /sessions` (crea agente, lo cachea, devuelve metadata)                 | `apps/server/src/routes/sessions.ts` | 30 min   |
| 6.4 | Implementar `GET /sessions` (lista sesiones)                                             | `apps/server/src/routes/sessions.ts` | 15 min   |
| 6.5 | Implementar `DELETE /sessions/:id` (dispose + delete)                                    | `apps/server/src/routes/sessions.ts` | 15 min   |
| 6.6 | Implementar `GET /health`                                                                | `apps/server/src/routes/health.ts`   | 5 min    |
| 6.7 | Implementar WebSocket handler (upgrade, auth, forward prompt, relay events)              | `apps/server/src/ws/handler.ts`      | 1h 30m   |
| 6.8 | Entry point `index.ts` (assembla Hono + WS + Bun.serve)                                  | `apps/server/src/index.ts`           | 20 min   |

### Fase 7: Client — React Chat UI (5h)

| #    | Tarea                                                                                    | Archivo(s)                                     | Esfuerzo |
| ---- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- | -------- |
| 7.1  | Setup Vite + React 19 + Tailwind v4 + TypeScript                                         | `apps/client/` (config files)                  | 30 min   |
| 7.2  | Implementar `apiFetch` wrapper                                                           | `apps/client/src/api/client.ts`                | 15 min   |
| 7.3  | Implementar `WsClient` (singleton con reconexión, cola offline, subscribe/send)          | `apps/client/src/api/ws.ts`                    | 1h       |
| 7.4  | Implementar `useWebSocket` hook (auto-subscribe/unsubscribe por sessionId)               | `apps/client/src/hooks/useWebSocket.ts`        | 30 min   |
| 7.5  | Implementar `useSessions` hook (CRUD: list, create, delete, select)                      | `apps/client/src/hooks/useSessions.ts`         | 45 min   |
| 7.6  | Implementar `useChat` hook (messages state, streaming updates, send, abort)              | `apps/client/src/hooks/useChat.ts`             | 1h       |
| 7.7  | Implementar `Layout` (header + sidebar + main area, responsive básico)                   | `apps/client/src/components/Layout.tsx`        | 45 min   |
| 7.8  | Implementar `SessionList` (sidebar con crear, seleccionar, eliminar)                     | `apps/client/src/components/SessionList.tsx`   | 45 min   |
| 7.9  | Implementar `MessageBubble` (user right, assistant left con avatar)                      | `apps/client/src/components/MessageBubble.tsx` | 30 min   |
| 7.10 | Implementar `Markdown` renderer (react-markdown o similar)                               | `apps/client/src/components/Markdown.tsx`      | 20 min   |
| 7.11 | Implementar `MessageList` (scroll automático, grupos de mensajes, tool calls básicos)    | `apps/client/src/components/MessageList.tsx`   | 1h       |
| 7.12 | Implementar `ChatInput` (textarea + send/stop button, Enter envía, streaming → stop)     | `apps/client/src/components/ChatInput.tsx`     | 45 min   |
| 7.13 | Implementar `ChatArea` (compone MessageList + ChatInput, conecta useChat + useWebSocket) | `apps/client/src/components/ChatArea.tsx`      | 1h       |
| 7.14 | Crear `App.tsx` (rutas: `/` → lista + área vacía, `/:sessionId` → chat)                  | `apps/client/src/App.tsx`                      | 30 min   |
| 7.15 | Tailwind global styles                                                                   | `apps/client/src/styles/index.css`             | 15 min   |

### Fase 8: Integración, Typecheck y Build (2h)

| #   | Tarea                                                                                     | Esfuerzo |
| --- | ----------------------------------------------------------------------------------------- | -------- |
| 8.1 | Integrar todos los paquetes: `pnpm install` en raíz                                       | 15 min   |
| 8.2 | `pnpm typecheck` en todos los workspaces, corregir errores                                | 1h       |
| 8.3 | `pnpm build` en todos los workspaces, corregir errores                                    | 30 min   |
| 8.4 | `pnpm dev` — verificar que server + client arrancan y se comunican                        | 15 min   |
| 8.5 | Prueba manual: crear sesión, enviar mensaje, recibir streaming, listar sesiones, eliminar | 30 min   |

---

## 6. Contratos de Paquete (Interfaces)

### Dependencias entre paquetes

```
apps/server ─────────────► packages/engine ──────► packages/core
apps/server ─────────────► packages/providers ───► packages/core
apps/server ─────────────► packages/tools ───────► packages/core
apps/server ─────────────► packages/storage ─────► packages/core
apps/server ─────────────► packages/sandbox ─────► packages/core

apps/client ─────────────► (independiente, solo llama API REST + WS)
```

**Regla**: `packages/core` no depende de nadie. Solo contiene interfaces y tipos. Cero implementaciones. Cero dependencias externas (salvo Zod para schemas).

### Qué exporta cada paquete

| Paquete                   | Exporta                                                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@auto-browser/core`      | Interfaces: `IAgentRuntime`, `IModelProvider`, `ITool`, `IToolRegistry`, `IToolExecutor`, `IPromptBuilder`, `PromptSection`, `Hook`, `IHookRunner`, `Rule`, `IPermissionEngine`, `ISessionStore`, `ISandbox`, `IWorkspaceProvider`, `IMemoryProvider`, `IEventBus`. Schemas Zod. Tipos: `AgentMessage`, `ToolCall`, `ToolResult`, `AgentEvent`, etc. |
| `@auto-browser/engine`    | `AgentRuntime`, `PromptBuilder`, `HookRunner`, `PermissionEngine`, `ToolExecutor`, `EventBus`, `createAgent()`                                                                                                                                                                                                                                       |
| `@auto-browser/providers` | `OpenAICompatibleProvider`, `ProviderRegistry`                                                                                                                                                                                                                                                                                                       |
| `@auto-browser/tools`     | `bash`, `read`, `write`, `edit`, `glob`, `grep`, `webfetch`, `DefaultToolRegistry`                                                                                                                                                                                                                                                                   |
| `@auto-browser/storage`   | `MemorySessionStore`, `FilesystemSessionStore`                                                                                                                                                                                                                                                                                                       |
| `@auto-browser/sandbox`   | `LocalSandbox`                                                                                                                                                                                                                                                                                                                                       |
| `@auto-browser/server`    | Entry point (Bun + Hono server)                                                                                                                                                                                                                                                                                                                      |
| `@auto-browser/client`    | React SPA (Vite build)                                                                                                                                                                                                                                                                                                                               |

---

## 7. Estrategia de Extensión Futura

Cada feature futura se agrega sin tocar el core, siguiendo estos patrones:

### 7.1 Agregar un tipo nuevo de agente (ej: ProjectAgent)

```ts
// Paquete nuevo o en factories/
function createProjectAgent(config: ProjectConfig): IAgentRuntime {
  const baseAgent = createAgent(config);

  // Agregar tools específicas de proyecto
  baseAgent.registerTools([manageFiles, gitTool]);

  // Agregar rules de sandbox de proyecto
  baseAgent.registerRules([new WorkspaceBoundaryRule(config.workspaceDir)]);

  // Agregar secciones de prompt
  baseAgent.registerPromptSection({
    id: "project-context",
    priority: 15,
    render: async (ctx) => `Project: ${config.name}\nWorkspace: ${config.workspaceDir}`,
  });

  return baseAgent;
}
```

### 7.2 Agregar Skills

```ts
// Una skill es simplemente una PromptSection con archivos de contexto
class SkillPromptSection implements PromptSection {
  id = "skill:my-skill";
  priority = 25;

  async render(ctx: AgentContext): Promise<string> {
    const skillFile = await fs.readFile(`./skills/my-skill/SKILL.md`, "utf-8");
    return `## Skill: My Skill\n${skillFile}`;
  }
}

agent.registerPromptSection(new SkillPromptSection());
```

### 7.3 Agregar MCP Tools

```ts
// MCP es un adaptador que traduce MCP servers → ITool[]
class McpToolAdapter implements ITool {
  constructor(private mcpServer: McpServer) {}

  get name() {
    return this.mcpServer.toolName;
  }
  get description() {
    return this.mcpServer.description;
  }
  get parameters() {
    return this.mcpServer.inputSchema;
  }

  async execute(args: unknown): Promise<ToolResult> {
    return this.mcpServer.callTool(args);
  }
}

// Registrar todas las tools de un MCP server
for (const mcpTool of mcpServer.tools) {
  toolRegistry.register(new McpToolAdapter(mcpTool));
}
```

### 7.4 Agregar Approvals

```ts
// Un hook que intercepta tool calls y pide confirmación
class ApprovalHook implements Hook {
  id = "approval";
  priority = 100; // ejecutar último en la cadena

  constructor(private ui: ApprovalUI) {}

  async beforeToolCall(ctx: ToolCallContext): Promise<ToolCallContext | null> {
    if (!ctx.tool.requiresApproval) return ctx;

    const approved = await this.ui.askUser(`Allow ${ctx.tool.name}?`);
    return approved ? ctx : null; // null = bloquear
  }
}

hookRunner.register(new ApprovalHook(myUI));
```

### 7.5 Agregar Memory (RAG)

```ts
// Una PromptSection que inyecta memorias relevantes
class MemoryPromptSection implements PromptSection {
  id = "memory";
  priority = 30;

  constructor(private memoryProvider: IMemoryProvider) {}

  async render(ctx: AgentContext): Promise<string> {
    const memories = await this.memoryProvider.search(ctx.lastMessage);
    if (memories.length === 0) return "";
    return "## Relevant Memories\n" + memories.map((m) => `- ${m.content}`).join("\n");
  }
}
```

### 7.6 Agregar Sandbox (Docker)

```ts
// Misma interfaz ISandbox, distinta implementación
class DockerSandbox implements ISandbox {
  async execute(cmd: string, opts?: SandboxOptions): Promise<SandboxResult> {
    const result = await docker.exec(this.containerId, cmd, opts);
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
  }
  // ...
}

// El agente no cambia, solo cambia qué ISandbox se inyecta
const agent = createAgent({ sandbox: new DockerSandbox(containerId) });
```

---

## 8. Estrategia de Migración desde the-spaces

### Lo que se REUTILIZA (cortar y adaptar)

| Source (the-spaces)                                 | Destino (auto-browser)                      | Adaptación necesaria                                          |
| --------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `apps/server/src/ai/vendor/agent/src/agent-loop.ts` | `packages/engine/src/agent-loop.ts`         | Desacoplar de dependencias internas, usar interfaces del core |
| `apps/server/src/ai/vendor/agent/src/types.ts`      | `packages/core/src/types.ts`                | Extraer solo los tipos del vendor loop                        |
| `apps/server/src/ai/session-persistence.ts`         | `packages/storage/src/filesystem.store.ts`  | Adaptar a `ISessionStore`, eliminar tree navigation           |
| `apps/server/src/ai/model-registry.ts`              | Adaptar lógica a `OpenAICompatibleProvider` | Simplificar: un solo provider genérico                        |
| `apps/client/src/lib/ws-client.ts`                  | `apps/client/src/api/ws.ts`                 | Misma lógica, mensajes simplificados                          |
| `apps/client/src/hooks/useWebSocket.ts`             | `apps/client/src/hooks/useWebSocket.ts`     | Misma lógica, simplificar tipos de mensajes                   |
| `packages/shared/src/schemas.ts`                    | `packages/core/src/schemas/`                | Extraer solo session + message schemas                        |

### Lo que se REESCRIBE desde cero

- **Todo el `core/` de the-spaces** (session-manager, delegation, config cascade, etc.) → se reemplaza por `packages/engine/`
- **Todo el cliente** → se reescribe minimalista, sin WorkspaceContext, sin MainLayout de 800 líneas, sin SessionSidebar de 500 líneas
- **Todas las rutas del server** → solo 3 endpoints + 1 WS handler

### Lo que NO se toca (referencia solamente)

- `apps/server/src/ai/vendor/` — se lee para entender el agent loop, no se copia tal cual
- `packages/spaces-sdk/` — inspiración para la API declarativa, no se reutiliza
- `plans/` — referencia de estilo y estructura

---

## 9. Riesgos y Decisiones

| Riesgo                                                                             | Decisión                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El agent loop del vendor de the-spaces está acoplado a sus tipos internos          | Extraer solo la lógica del loop, adaptar a las interfaces del core. Si es muy complejo, implementar un loop propio simplificado basado en el mismo patrón (LLM call → parse tools → execute → repeat)         |
| `streamComplete` en OpenAI-compatible requiere manejo de SSE y tool call streaming | Usar `fetch` con `ReadableStream`, parsear manualmente. Priorizar robustez sobre features (sin streaming de tool calls en MVP)                                                                                |
| La UI puede crecer en complejidad si se copian patrones de the-spaces              | Empezar con componentes absolutamente mínimos. Si un componente pasa de 200 líneas, dividir. No agregar features visuales hasta que el core funcione                                                          |
| El plan parece ambicioso para un MVP                                               | Priorizar Fase 0-8 en orden. Si el tiempo apremia, las Fases 4 (tools), 5 (storage), 7 (client) se pueden simplificar: menos tools, solo memory store, UI aún más mínima. El core (Fases 1-3) es innegociable |
| Bun puede tener quirks con WebSocket + Hono                                        | Usar `hono/bun` integration (`createBunWebSocket`) que es la oficial                                                                                                                                          |

---

## 10. Volumen Estimado Total

| Fase                      | Paquetes       | Archivos nuevos  | Líneas estimadas  |
| ------------------------- | -------------- | ---------------- | ----------------- |
| Fase 0: Setup             | Todos          | ~15              | ~200              |
| Fase 1: Core (interfaces) | `core`         | ~18              | ~400              |
| Fase 2: Engine            | `engine`       | ~9               | ~800              |
| Fase 3: Providers         | `providers`    | ~3               | ~250              |
| Fase 4: Tools             | `tools`        | ~8               | ~350              |
| Fase 5: Storage           | `storage`      | ~3               | ~250              |
| Fase 6: Server            | `server`       | ~5               | ~350              |
| Fase 7: Client            | `client`       | ~16              | ~1,200            |
| Fase 8: Integration       | Todos          | ~3               | ~100              |
| **Total**                 | **8 paquetes** | **~80 archivos** | **~3,900 líneas** |

---

## Apéndice A: Reglas de Integridad del Código

```
1. Ninguna clase > 200 líneas
   → Si crece, extraer submódulo con responsabilidad única
2. Ningún singleton
   → Toda dependencia se inyecta por constructor o context object
3. Ningún `any`
   → TypeScript strict mode, `noImplicitAny`, `strictNullChecks`
4. Ninguna dependencia circular
   → Interfaces en core/ports/, implementaciones en su paquete
   → El core no importa de engine/tools/providers/storage NUNCA
5. Ningún hardcodeo de providers/tools
   → Todo se registra en runtime
6. Schemas co-localizados con su dominio
   → Nada de schemas.ts monolítico
7. Tests junto al código
   → *.test.ts en el mismo directorio
8. Sin comentarios innecesarios
   → El código debe ser auto-documentado. Solo comentar por qué, no qué
```

## Apéndice B: Comandos del Workspace

```bash
pnpm dev                  # Inicia server + client en paralelo
pnpm build                # Build de todos los paquetes y apps
pnpm typecheck            # TypeScript strict check en todo
pnpm lint                 # ESLint flat config
pnpm format               # Prettier
pnpm --filter @auto-browser/server dev     # Solo el server
pnpm --filter @auto-browser/client dev     # Solo el cliente
```
