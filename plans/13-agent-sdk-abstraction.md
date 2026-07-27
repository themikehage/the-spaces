# Spaces — 13 · Abstracción ADK-Level: Agent Runtime como SDK Declarativo

> Análisis de cómo llevar el Spaces Agent Runtime al nivel de abstracción de Google ADK (`new LlmAgent({ name, model, instruction, tools })`) usando la infraestructura ya existente. Inspirado en el diseño de `@google/adk` ([adk.dev](https://adk.dev), [github.com/google/adk-js](https://github.com/google/adk-js)).

---

## 1. El Patrón ADK — Lo que Queremos Alcanzar

```ts
import { LlmAgent, GOOGLE_SEARCH } from "@google/adk";

const agent = new LlmAgent({
  name: "researcher",
  model: "gemini-flash-latest",
  instruction: "You help users research topics thoroughly.",
  tools: [GOOGLE_SEARCH],
});
```

El patrón es **declarativo, mínimamente verboso, y portable**: defines un agente con 4 propiedades y ya puedes ejecutarlo desde CLI (`adk run`), web UI (`adk web`), o incrustarlo como `AgentTool` dentro de otro agente. No hay acoplamiento a un servidor HTTP, WebSocket, rutas, ni base de datos.

### Jerarquía de Conceptos en ADK

```
Agent (LlmAgent)
├── name: string                    — identidad
├── description?: string            — para routing multi-agente
├── model: string                   — modelo LLM
├── instruction: string             — system prompt
├── tools?: Tool[]                  — funciones, MCP, AgentTool
├── generateContentConfig?          — temperature, maxTokens, safety
├── inputSchema / outputSchema?     — structured I/O
├── outputKey?: string              — guarda resultado en state
├── includeContents?: "default" | "none"
├── planner?: BasePlanner
├── callbacks?: Callback[]          — hooks de ciclo de vida
└── subAgents?: LlmAgent[]          — delegación multi-agente

Tool
├── FunctionTool({ name, description, parameters: ZodSchema, execute })
├── AgentTool(agent)                 — otro agente como tool
├── McpTool                          — MCP servers
└── OpenApiTool                      — specs OpenAPI

Runner
└── Ejecuta el agent loop: user message → LLM → tool calls → response
```

---

## 2. Estado Actual de Spaces — ¿Qué Tan Cerca Estamos?

Spaces ya tiene los bloques fundamentales. El gap es de **capa de presentación**, no de funcionalidad:

### Mapeo Spaces ↔ ADK

| Concepto ADK                   | Equivalente en Spaces                     | Archivo                                      | Estado                               |
| ------------------------------ | ----------------------------------------- | -------------------------------------------- | ------------------------------------ |
| `LlmAgent` constructor         | `createAgentRuntime(config)`              | `core/session/agent-runtime.ts`              | ✅ Existe                            |
| `name` / `description`         | `AgentDefinition.name` / `.role`          | `packages/shared/src/schemas.ts:265-280`     | ✅ Existe                            |
| `model`                        | ModelResolver cascade                     | `core/session/model-resolver.ts`             | ✅ Existe                            |
| `instruction`                  | `AgentDefinition.systemPrompt`            | `schemas.ts:270`                             | ✅ Existe                            |
| `tools: Tool[]`                | `customTools: BaseTool[]`                 | `agent-runtime.ts:24-31`                     | ✅ Existe                            |
| `FunctionTool`                 | `FunctionTool<T>`                         | `packages/shared/src/tools/function-tool.ts` | ✅ Existe                            |
| `generateContentConfig`        | `thinkingLevel` en `ModelSettingsSchema`  | `schemas.ts:45-49`                           | 🔶 Parcial                           |
| `outputSchema` / `outputKey`   | No existe                                 | —                                            | ❌ No existe                         |
| `planner`                      | No existe como abstracción                | —                                            | ❌ No existe                         |
| `callbacks` / plugins          | `BasePlugin` + `PluginManager`            | `packages/shared/src/plugins/`               | ✅ Existe                            |
| `AgentTool` (delegación)       | `manage_delegations` tool                 | `core/tools/manage-delegations-tool.ts`      | 🔶 Existe pero no como tool portable |
| `Runner`                       | `AgentSession` loop                       | `ai/agent-session.ts`                        | ✅ Existe                            |
| `Session` / `State` / `Memory` | `SessionMetadataStore` + `MemoryRegistry` | `core/session/`                              | ✅ Existe                            |
| CLI (`adk run`)                | No existe                                 | —                                            | ❌ No existe                         |
| SDK package (`@google/adk`)    | `packages/spaces-sdk`                     | `packages/spaces-sdk/src/index.ts`           | 🔶 Thin wrapper                      |

### La Brecha Principal

El `createAgentRuntime()` actual **requiere un `ServerContext` completo** (WebSocket, DI container, rutas HTTP). Para ejecutar un agente necesitas:

```ts
// Spaces HOY — necesita todo el servidor
const serverContext = createServerContext();
const runtime = createAgentRuntime({
  username,
  sessionId,
  projectId,
  agentId,
  toolProfile: "user-session",
});
```

ADK permite:

```ts
// ADK — standalone, sin servidor
const agent = new LlmAgent({ name, model, instruction, tools });
const runner = new Runner(agent);
await runner.run("What's the capital of France?");
```

---

## 3. Diseño Propuesto: `SpacesAgent` + `SpacesRunner`

### 3.1 `SpacesAgent` — Constructor Declarativo

Un wrapper declarativo sobre `createAgentRuntime()` que oculta toda la infraestructura del servidor y resuelve defaults automáticamente vía `CascadeConfigLoader` (Plan 12):

```ts
import { SpacesAgent, bash, read, write, webFetch } from "@spaces/sdk";

const agent = new SpacesAgent({
  name: "devops-helper",
  model: "openai/gpt-4o",
  instruction: "You are a DevOps engineer. Help users manage their infrastructure.",
  tools: [bash, read, write, webFetch],
  temperature: 0.3,
  maxTokens: 4096,
  memory: true,
  skills: ["docker", "kubernetes"],
});
```

### 3.2 API Surface del Constructor

```ts
interface SpacesAgentConfig {
  // === Identidad (required) ===
  name: string;
  model?: string; // provider/modelId o "auto" (cascade)
  instruction: string;
  description?: string;

  // === Tools (optional, defaults a built-in seguras) ===
  tools?: BaseTool[]; // FunctionTool, AgentTool, McpTool, etc.
  toolOverrides?: { add?: string[]; remove?: string[] };

  // === Model config (optional) ===
  temperature?: number;
  maxTokens?: number;
  thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high";

  // === Execution mode (optional) ===
  executionMode?: "readonly" | "standard" | "autonomous";
  autonomyLevel?: "auto" | "propose" | "suggest";

  // === Skills (optional) ===
  skills?: string[]; // Nombres de skills a cargar

  // === Memory (optional) ===
  memory?: boolean; // default: true

  // === Permissions (optional) ===
  permissionOverrides?: Record<string, "allow" | "deny" | "ask">;

  // === Workspace (optional) ===
  workspaceDir?: string; // Override al workspace del agente

  // === Extensibilidad ===
  plugins?: BasePlugin[];
  hooks?: Record<string, unknown>; // Extensible para futuros hooks
}
```

### 3.3 `SpacesRunner` — Orquestador Standalone

```ts
class SpacesRunner {
  constructor(
    agent: SpacesAgent,
    options?: {
      workspaceDir?: string;
      sessionId?: string;
    },
  );

  async run(input: string): Promise<RunResult>;
  async stream(input: string): AsyncGenerator<StreamEvent>;

  // Acceso al estado
  get state(): Record<string, unknown>;
  get sessionId(): string;
  get memory(): MemoryStore;
}
```

### 3.4 Built-in Tools como Exports del SDK

```ts
// packages/spaces-sdk/src/index.ts
export { SpacesAgent, SpacesRunner } from "./agent";
export { bash, read, write, edit, grep, find, ls } from "./tools/filesystem";
export { webFetch, webSearch } from "./tools/web";
export { askQuestion, requestApproval } from "./tools/ui";
export { manageDelegations } from "./tools/delegation";
export { memoryStore, memorySearch } from "./tools/memory";
export { FunctionTool } from "./tools";
```

Cada tool built-in es un `FunctionTool` pre-instanciado (o factory lazy) que no requiere config:

```ts
// packages/spaces-sdk/src/tools/filesystem.ts
export const bash = new FunctionTool({
  name: "bash",
  description: "Executes a bash command in a sandboxed environment.",
  parameters: z.object({ command: z.string(), workdir: z.string().optional() }),
  execute: async (params) => {
    /* sandbox execution */
  },
});
```

---

## 4. Arquitectura Interna — Cómo Funciona

### 4.1 `SpacesAgent` Internals

```ts
class SpacesAgent {
  private config: SpacesAgentConfig;
  private agentDef: AgentDefinition;
  private userConfig: UserConfigManager;
  private modelRegistry: ModelRegistry;

  constructor(config: SpacesAgentConfig) {
    this.config = config;
    this.agentDef = this.buildAgentDefinition(config);
    // No inicializa el runtime aún — lazy, al llamar run()
  }

  private buildAgentDefinition(config: SpacesAgentConfig): AgentDefinition {
    return {
      id: config.name,
      name: config.name,
      role: config.description ?? config.instruction.slice(0, 100),
      systemPrompt: config.instruction,
      model: config.model,
      skills: config.skills,
      serialTools: [], // built-in tools se pasan como customTools
    };
  }

  async createRuntime(username: string, sessionId: string): Promise<AgentRuntimeInstance> {
    // 1. Resolver workspace dir
    const workspaceDir =
      this.config.workspaceDir ?? getAgentWorkspaceDir(username, this.config.name);

    // 2. Crear runtime usando createAgentRuntime existente
    const runtime = createAgentRuntime({
      username,
      sessionId,
      agentId: this.config.name,
      toolProfile: "user-session",
      customTools: this.config.tools,
      toolOverrides: this.config.toolOverrides,
      skipMemory: !this.config.memory,
      customWorkspaceDir: workspaceDir,
    });

    // 3. Aplicar config adicional
    if (this.config.temperature || this.config.maxTokens) {
      runtime.session.setModelConfig({
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });
    }

    return runtime;
  }
}
```

### 4.2 `SpacesRunner` Internals

```ts
class SpacesRunner {
  private agent: SpacesAgent;
  private runtime?: AgentRuntimeInstance;
  private username: string;
  private sessionId: string;

  constructor(agent: SpacesAgent, options?: RunnerOptions) {
    this.agent = agent;
    this.username = options?.username ?? "default";
    this.sessionId = options?.sessionId ?? crypto.randomUUID();
  }

  async run(input: string): Promise<RunResult> {
    this.runtime = await this.agent.createRuntime(this.username, this.sessionId);
    const session = this.runtime.session;

    const response = await session.prompt(input);

    return {
      text: response.text,
      toolCalls: response.toolCalls,
      state: this.state,
      sessionId: this.sessionId,
    };
  }

  async *stream(input: string): AsyncGenerator<StreamEvent> {
    this.runtime = await this.agent.createRuntime(this.username, this.sessionId);
    const session = this.runtime.session;

    for await (const event of session.stream(input)) {
      yield { type: event.type, content: event.content };
    }
  }
}
```

---

## 5. Plan de Implementación

### Fase 1: `SpacesAgent` + `SpacesRunner` (Core SDK)

| #   | Tarea                                                                                                   | Archivo                          | Esfuerzo |
| --- | ------------------------------------------------------------------------------------------------------- | -------------------------------- | -------- |
| 1.1 | Definir `SpacesAgentConfig` Zod schema en `packages/spaces-sdk`                                         | `src/agent/config.ts`            | 30 min   |
| 1.2 | Implementar `SpacesAgent` class (wrapper sobre `createAgentRuntime`)                                    | `src/agent/agent.ts`             | 2h       |
| 1.3 | Implementar `SpacesRunner` class (standalone loop)                                                      | `src/agent/runner.ts`            | 2h       |
| 1.4 | Desacoplar `AgentSession.prompt()` y `AgentSession.stream()` para no requerir `ServerContext`/WebSocket | `ai/agent-session.ts`            | 4h       |
| 1.5 | Tests: `new SpacesAgent({...}).run("hello")` funciona sin servidor                                      | `__tests__/spaces-agent.test.ts` | 2h       |

### Fase 2: Built-in Tools como Exports Declarativos

| #   | Tarea                                                                                              | Esfuerzo |
| --- | -------------------------------------------------------------------------------------------------- | -------- |
| 2.1 | Extraer `bash`, `read`, `write`, `edit`, `grep`, `find`, `ls` como `FunctionTool` pre-instanciados | 3h       |
| 2.2 | Extraer `webFetch`, `webSearch` como tools exportables                                             | 1h       |
| 2.3 | Extraer `askQuestion`, `requestApproval` como tools                                                | 1h       |
| 2.4 | Extraer `memoryStore`, `memorySearch` como tools                                                   | 1h       |
| 2.5 | Barrel exports en `packages/spaces-sdk/src/tools/`                                                 | 30 min   |

### Fase 3: Experiencia Standalone (CLI + Node.js Script)

| #   | Tarea                                                                     | Esfuerzo |
| --- | ------------------------------------------------------------------------- | -------- |
| 3.1 | `spaces-agent.ts` CLI entry point para ejecutar agentes desde terminal    | 3h       |
| 3.2 | `SpacesRunner` con soporte de streaming SSE/console                       | 2h       |
| 3.3 | Generador de proyecto: `npx create-spaces-agent` que escupe un `agent.ts` | 3h       |

### Fase 4: Output Schema + Planner (Futuro)

| #   | Tarea                                                                     | Esfuerzo |
| --- | ------------------------------------------------------------------------- | -------- |
| 4.1 | `outputSchema` — structured output con Zod schema forzado en la respuesta | 3h       |
| 4.2 | `outputKey` — guardar resultado en session state                          | 30 min   |
| 4.3 | `planner` — abstracción de planificación (ReAct, Tree-of-Thought)         | 5h       |

---

## 6. Comparativa Final: Spaces SDK vs ADK

### Ejemplo equivalente

**ADK:**

```ts
import { LlmAgent, GOOGLE_SEARCH } from "@google/adk";
const agent = new LlmAgent({
  name: "researcher",
  model: "gemini-flash-latest",
  instruction: "You help users research topics.",
  tools: [GOOGLE_SEARCH],
});
```

**Spaces (objetivo):**

```ts
import { SpacesAgent, bash, read, write, webFetch } from "@spaces/sdk";
const agent = new SpacesAgent({
  name: "devops-helper",
  model: "openai/gpt-4o",
  instruction: "You are a DevOps engineer.",
  tools: [bash, read, write, webFetch],
});
```

### Tabla Comparativa

| Dimensión               | ADK                             | Spaces (objetivo)                                    |
| ----------------------- | ------------------------------- | ---------------------------------------------------- |
| Constructor declarativo | `new LlmAgent({...})`           | `new SpacesAgent({...})`                             |
| Runner standalone       | `new Runner(agent)`             | `new SpacesRunner(agent)`                            |
| Tools built-in          | `GOOGLE_SEARCH`, `FunctionTool` | `bash`, `read`, `write`, `webFetch`, `FunctionTool`  |
| Multi-agente            | `AgentTool(anotherAgent)`       | `manage_delegations` tool (ya existe)                |
| Streaming               | `runner.stream()`               | `runner.stream()`                                    |
| Plugins                 | `BasePlugin` 15 hooks           | `BasePlugin` 5 hooks (ya existe)                     |
| Skills                  | File-based SKILL.md             | File-based SKILL.md (ya existe)                      |
| MCP                     | McpTool                         | mcpRegistry (ya existe)                              |
| Workspace/Persistencia  | No (solo sesión)                | **Sí** — sistema de archivos + `.spaces/config.json` |
| Permisos por instancia  | No                              | **Sí** — PermissionEngine + CascadeConfigLoader      |
| CLI tool                | `adk run`                       | `spaces-agent run` (nuevo)                           |
| Web UI                  | `adk web`                       | **Ya existe** (client React)                         |
| API Server              | `adk api-server`                | **Ya existe** (Bun + Hono)                           |
| Deploy                  | Cloud Run, GKE                  | **Ya existe** (Coolify, Docker)                      |

---

## 7. Riesgos y Decisiones

| Riesgo                                                                                                  | Decisión                                                                                        |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `AgentSession` está acoplado a WebSocket broadcasting                                                   | Refactorizar para que el WS sea un plugin opcional (`WsNotifyPlugin`), no un requisito del loop |
| Los tools actuales dependen de `SessionToolFactory` que recibe `modelRegistry`, `approvalManager`, etc. | Inyectar esas dependencias vía `ServerContext` — ya está diseñado en Plan 10                    |
| `createAgentRuntime` espera `username` + `sessionId`                                                    | El `SpacesRunner` genera sessionId automáticamente y usa un username por defecto                |
| Los tools built-in (`bash`, `read`) tienen dependencias al sandbox                                      | El sandbox ya está desacoplado (`restricted-paths.ts`, `permission-engine.ts`)                  |

---

## 8. Volumen Estimado

| Fase                    | Archivos nuevos | Archivos modificados | Líneas   |
| ----------------------- | --------------- | -------------------- | -------- |
| Fase 1 (Core)           | 3               | 1                    | ~300     |
| Fase 2 (Built-in Tools) | 5               | 1                    | ~200     |
| Fase 3 (CLI)            | 2               | 0                    | ~250     |
| Fase 4 (Output Schema)  | 1               | 1                    | ~150     |
| **Total**               | **11**          | **3**                | **~900** |

---

## 9. Relación con el Plan 12 (CascadeConfigLoader)

El Plan 12 y este plan son **complementarios y sinérgicos**:

- **Plan 12** resuelve de dónde sale la configuración (`.spaces/config.json` por entidad, cascada de herencia).
- **Plan 13** resuelve cómo se consume esa configuración (constructor declarativo, runner standalone).

Juntos permiten:

```ts
// Configuración implícita vía CascadeConfigLoader
const agent = new SpacesAgent({
  name: "devops-helper",
  // model NO especificado → cascade: agent config → project → global
  // tools NO especificados → cascade: agent scope → project → global → defaults
  // skills NO especificados → cascade: agent skills → project skills → global
  instruction: "You are a DevOps engineer.",
});

// O explícita, pisando la cascada:
const agent = new SpacesAgent({
  name: "devops-helper",
  model: "openai/gpt-4o", // pisa la cascada
  tools: [bash, webFetch], // pisa la cascada
  instruction: "You are a DevOps engineer.",
});
```
