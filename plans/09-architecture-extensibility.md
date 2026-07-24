# Spaces — Extensibilidad de Arquitectura (Análisis Competitivo vs. Google ADK)

> Este documento es el resultado de un análisis comparativo entre el modelo de extensibilidad de Spaces y el de Google ADK (Agent Development Kit).
> Responde la pregunta: ¿qué gaps estructurales tiene Spaces en las 5 áreas de extensibilidad que definen a una plataforma de agentes madura?
> No asume implementación previa — diagnostica el estado actual y traza el camino.

---

## Diagnóstico de Partida

Google ADK se diseñó desde el día 0 con extensibilidad como _first-class concern_. Spaces, en cambio, se diseñó para resolver problemas de producto primero y la extensibilidad fue emergiendo como necesidad. Esto es normal en la evolución de una plataforma, pero crea deuda arquitectónica en 5 frentes específicos.

El punto no es "copiar ADK". Es entender qué decisiones de diseño hacen que ADK sea extensible por terceros sin modificar código interno, y aplicar ese aprendizaje donde Spaces tiene el mismo desafío.

---

## Área 1: Sistema de Plugins

### Estado Actual

Spaces tiene 4 hooks funcionales pero están incrustados como opciones de configuración en `AgentSession`, no como plugins intercambiables:

```
apps/server/src/core/session/
├── before-tool-call-hook.ts    → createBeforeToolCallHook({ wsNotify, auditLog })
├── after-tool-call-hook.ts     → createAfterToolCallHook({ wsNotify, auditLog })
├── prompt-builder.ts           → buildSystemPrompts() — transformContext implícito
└── agent-runtime.ts:124        → modelRegistry.getApiKeyAndHeaders() — getApiKey inline
```

Estos hooks se cablean manualmente en `createAgentRuntime()` (líneas 141-163 de `agent-runtime.ts`). No hay:
- Una interfaz unificada de plugin
- Un mecanismo de registro/descubrimiento
- Ordenamiento por prioridad o short-circuit
- Posibilidad de que un tercero agregue un hook sin tocar `createAgentRuntime`

Es el equivalente de tener las paredes maestras de una casa decididas por el constructor original sin planos — funciona, pero cualquier ampliación requiere romper paredes.

### Lo que ADK Hace

ADK define `BasePlugin` con 15 hooks de ciclo de vida, cada uno con una firma precisa y un `PluginManager` que los orquesta:

```
BasePlugin
├── onUserMessageCallback(messages) → messages | void
├── beforeRunCallback(context)      → context | void
├── beforeAgentCallback(context)    → context | void
├── afterAgentCallback(context)     → context | void
├── beforeModelCallback(context)    → context | void
├── afterModelCallback(context)     → context | void
├── beforeToolCallback(tool, args)  → { tool, args } | void
├── afterToolCallback(tool, args, result, error) → result | void
├── onModelErrorCallback(error)     → error | void
├── onToolErrorCallback(error)      → error | void
├── beforeToolSelection(tools)     → tools | void
├── beforeContextCompaction(ctx)   → ctx | void
├── afterContextCompaction(ctx)    → ctx | void
├── onEventCallback(event)         → void
└── afterRunCallback(context)      → context | void

PluginManager
├── executeBeforeHooks(hookName, ...)  → ejecuta en orden, soporta short-circuit
├── executeAfterHooks(hookName, ...)   → ejecuta en orden, no short-circuit
└── prioridad: orden de registro con número mágico (0-1000) para built-ins
```

Plugins built-in: `LoggingPlugin`, `GlobalInstructionPlugin`, `SecurityPlugin`. Todos implementan `BasePlugin` y se registran en `PluginManager` sin código especial en el core.

### Lo que Spaces Necesita

El mapeo de hooks de ADK a eventos del ciclo de vida de Spaces:

| Hook ADK | Equivalente en Spaces | Existe hoy? |
|---|---|---|
| `onUserMessageCallback` | Interceptar mensaje antes de enqueue | No — todo va directo al loop |
| `beforeAgentCallback` | Al inicializar `createAgentRuntime` | No — la factory es monolítica |
| `afterAgentCallback` | Al finalizar sesión (éxito o error) | No — `afterToolCall` no es lo mismo |
| `beforeModelCallback` | Antes de enviar mensajes al LLM | No — `transformContext` existe pero es un solo callback |
| `afterModelCallback` | Después de recibir respuesta del LLM | No |
| `beforeToolCallback` | **`beforeToolCall`** | **Sí** — cableado manualmente |
| `afterToolCallback` | **`afterToolCall`** | **Sí** — cableado manualmente |
| `onModelErrorCallback` | Cuando el LLM falla (rate limit, timeout) | Parcial — el loop maneja retry pero no notifica |
| `onToolErrorCallback` | Cuando una tool falla en ejecución | Parcial — `afterToolCall` recibe error |
| `beforeContextCompaction` | Antes de compactar contexto en sesiones largas | No |
| `afterContextCompaction` | Después de compactar | No |
| `onEventCallback` | Eventos del `EventBroker` | No — el broker existe pero no tiene hooks |
| `afterRunCallback` | Al terminar el loop del agente | No |

**Lo que falta:**
- Diseñar `BasePlugin` interface con hooks que mapeen al ciclo de vida real de Spaces (no copiar los 15 de ADK ciegamente — Spaces tiene menos superficie)
- Crear `PluginManager` con registro por prioridad, orden determinista y soporte de short-circuit (un plugin puede decir "no sigas")
- Extraer los hooks existentes (`beforeToolCall`, `afterToolCall`, `transformContext`) en implementaciones de plugin estándar: `AuditLogPlugin`, `WebSocketNotifyPlugin`, `MemoryEnricherPlugin`
- Crear API de registro: directorio `plugins/` en el workspace del usuario con descubrimiento basado en `index.ts` + `manifest.json` o `plugin.ts` con export nombrado
- Documentar el contrato de plugin con ejemplo funcional: un `RateLimitPlugin` que capée llamadas por sesión
- Evaluar sandbox de seguridad para plugins de terceros: ¿`vm2`/`isolated-vm` o simplemente confianza por revisión?

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Loop (vendor)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               PluginManager.executeHook()             │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ Plugin 1 │  │ Plugin 2 │  │ Plugin N │  ...      │  │
│  │  │ priority │  │ priority │  │ priority │           │  │
│  │  │    10    │  │    50    │  │   100    │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  │       │              │              │                │  │
│  │       ▼              ▼              ▼                │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │  beforeToolCall → beforeModelCall → after... │    │  │
│  │  │  Cada hook puede: continuar | modificar      │    │  │
│  │  │  | short-circuit (no ejecutar siguientes)    │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

Registro de plugins (3 fuentes):
  ├── Built-in: plugins internos (audit, ws-notify, memory-enricher)
  ├── Workspace: <workspace>/.spaces/plugins/*.ts
  └── Global: <SPACES_DATA_PATH>/plugins/*.ts
```

---

## Área 2: Abstracción de Proveedores de Modelos

### Estado Actual

Spaces soporta 9 proveedores y eso es impresionante para el tamaño del equipo. Pero la abstracción que lo sostiene es frágil. El archivo clave es `model-registry.ts` (431 líneas) y revela el problema:

```
apps/server/src/core/providers/
├── openai-provider.ts      → registerOpenAIProvider(registry)
├── google-provider.ts      → registerGoogleProvider(registry)
├── xai-provider.ts         → registerXAIProvider(registry)
├── deepseek-provider.ts    → registerDeepSeekProvider(registry)
├── groq-provider.ts        → registerGroqProvider(registry)
├── mistral-provider.ts     → registerMistralProvider(registry)
├── openrouter-provider.ts  → registerOpenRouterProvider(registry, username)
├── qwen-provider.ts        → registerQwenProvider(registry, username)
└── opencode-go-provider.ts → registerOpenCodeGoProvider(registry, username)
```

El patrón es: cada provider es una función `register*Provider(registry: ModelRegistry)` que llama a `registry.registerProvider(name, config)`. Esto _parece_ limpio, pero:

1. **`ModelRegistry` es un monolito**: 431 líneas haciendo 3 cosas distintas — registro de providers, resolución de API keys, enriquecimiento desde models.dev. No hay separación de concerns.

2. **La normalización de context windows es frágil** (`model-registry.ts:302-335`): la función `toNumber()` prueba ~25 nombres de propiedad distintos (`contextWindow`, `context_window`, `maxContextTokens`, `contextLength`, `context_length`, `max_input_tokens`, `input_tokens`, `maxTokens`, `max_tokens`, `maxOutputTokens`, `output_tokens`, `tokenLimit`...) porque models.dev no tiene un schema estable. Cada provider nuevo es una apuesta sobre qué campo usa.

3. **Agregar un provider requiere tocar 3 lugares**: el archivo de provider (`register*`), `user-config.ts` (donde se llama a `register*`), y `AuthStorage` (si tiene API key propia). No hay un formato declarativo.

4. **No hay `BaseLlm` interface**: el loop del agente (`vendor/agent/src/agent-loop.ts`) llama a `getApiKey()` y usa el modelo configurado, pero no hay una abstracción `generateContent()` que cada provider implemente. La conexión real al LLM ocurre en código vendor que no fue diseñado para extensibilidad.

### Lo que ADK Hace

```
BaseLlm (abstract class)
├── generateContentAsync(llmRequest): Promise<LlmResponse>
├── connect(): void
└── model: string

LLMRegistry
├── register(llm: BaseLlm): void
├── resolve(modelName: string): BaseLlm  // regex patterns
└── list(): BaseLlm[]

RoutedLlm (composite)
├── primary: BaseLlm
├── fallbacks: BaseLlm[]
└── resolve(modelRequest): BaseLlm  // failover automático
```

El patrón es: extendé `BaseLlm`, implementá `generateContentAsync()`, registralo con `LLMRegistry.register()`. El registry matchea nombres de modelo con regex. Cualquier provider nuevo es **un archivo** que extiende `BaseLlm`.

### Lo que Spaces Necesita

**Lo que falta:**
- Diseñar `BaseLlmProvider` interface con:
  - `id: string` — identificador único del provider
  - `matchModel(modelId: string): boolean` — si este provider maneja este modelo
  - `generateContent(request): Promise<LlmResponse>` — interfaz estándar de generación
  - `capabilities: ProviderCapabilities` — ¿soporta streaming? ¿tools? ¿vision? ¿structured output?
  - `listModels(): ProviderModel[]` — catálogo autodescriptivo
- Crear `LLMRegistry` con resolución por patrón (no por lista hardcodeada):
  ```ts
  registry.register({
    provider: new OpenAIProvider(),
    patterns: [/^gpt-/, /^o1-/, /^o3-/],
  })
  ```
- Extraer la lógica de models.dev en un servicio separado `ModelEnrichmentService` (no dentro de `ModelRegistry`)
- Crear formato declarativo de provider: `providers/openai.provider.ts` exporta `{ provider, patterns }` y un index los descubre automáticamente
- Soportar configuración de provider desde `.spaces/config.json` sin tocar TypeScript:
  ```json
  {
    "providers": {
      "custom-llm": {
        "type": "openai-compatible",
        "baseUrl": "http://localhost:11434/v1",
        "apiKey": "$OLLAMA_API_KEY",
        "models": ["llama3.2", "mistral"]
      }
    }
  }
  ```
- Documentar "cómo agregar un provider nuevo en 1 archivo"

### Arquitectura Propuesta

```
┌──────────────────────────────────────────────────────────────┐
│                    LLMRegistry                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ OpenAI   │  │ Google   │  │ Groq     │  │ Custom     │  │
│  │ Provider │  │ Provider │  │ Provider │  │ HTTP       │  │
│  │          │  │          │  │          │  │ Provider   │  │
│  │ patterns │  │ patterns │  │ patterns │  │ patterns   │  │
│  │ /^gpt-/  │  │ /^gemini/│  │ /^llama/ │  │ /.*/       │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │              │              │               │         │
│       ▼              ▼              ▼               ▼         │
│  resolve("gpt-4o") ──► OpenAIProvider.generateContent()      │
│  resolve("gemini-2.5") ──► GoogleProvider.generateContent()  │
│  resolve("llama-3.2") ──► GroqProvider.generateContent()     │
└──────────────────────────────────────────────────────────────┘

Cada provider implementa:
  interface BaseLlmProvider {
    id: string;
    matchModel(modelId: string): boolean;
    generateContent(req: LlmRequest): Promise<LlmResponse>;
    generateContentStream(req: LlmRequest): AsyncIterable<LlmChunk>;
    capabilities: {
      streaming: boolean;
      tools: boolean;
      vision: boolean;
      structuredOutput: boolean;
      maxContextWindow: number;
    };
    listModels(): ProviderModel[];
  }
```

---

## Área 3: Capa de Abstracción de Herramientas (Tools)

### Estado Actual

El sistema de tools de Spaces está en un punto intermedio: funcional pero sin tipado fuerte y sin jerarquía de abstracción:

```ts
// Así se crea una tool hoy (tool-factory.ts):
const bashTool = createBashToolDefinition(workspaceDir, { spawnHook, ... });
// Retorna: { name, description, schema, execute } — un objeto plano, no una clase
```

Problemas concretos:
1. **No hay `BaseTool`**: cada tool es un objeto literal `{ name, description, schema, execute }`. Sin clase base ni interfaz formal, no hay manera de inspeccionar tools programáticamente (ej: "dame todas las tools que modifican archivos").
2. **No hay `ToolDeclaration` type**: el tipo de tool que fluye por el sistema es `any` (`customTools: any[]` en `AgentRuntimeConfig` línea 29 de `agent-runtime.ts`).
3. **No hay `Toolset`**: las herramientas MCP se inyectan con string concatenation (`mcp_${server}_${tool}`) sin agrupación semántica. Las tools de skills o factory no tienen namespace.
4. **El resultado de ejecución no está estandarizado**: cada tool retorna lo que quiere — string, objeto, error crudo. No hay `ToolResult` envelope.
5. **`customTools: any[]`**: el tipo `any` en la interfaz pública de `AgentRuntimeConfig` le dice a cualquier consumidor "arreglate solo".

### Lo que ADK Hace

```
BaseTool (abstract class)
├── name: string
├── description: string
├── _getDeclaration(): FunctionDeclaration  // schema + description
└── runAsync(args: ToolArgs): Promise<ToolResult> | AsyncIterable<ToolResult>

BaseToolset (abstract class)
├── name: string
├── getTools(): Promise<BaseTool[]>  // dinámico — puede cambiar entre llamadas
└── close(): void

FunctionTool
├── constructor(name, description, fn: (args: T) => Promise<R>, schema: ZodSchema<T>)
└── genera automáticamente FunctionDeclaration desde Zod

AgentTool
└── wrappea un agente como tool (útil para multi-agente)
```

El patrón es limpio: `BaseTool` es el contrato mínimo. `BaseToolset` agrupa tools que comparten ciclo de vida (ej: tools MCP que necesitan conexión). `FunctionTool` es la fábrica para el 90% de los casos.

### Lo que Spaces Necesita

**Lo que falta:**
- Crear `BaseTool` interface/class:
  ```ts
  interface BaseTool {
    readonly name: string;
    readonly description: string;
    readonly declaration: ToolDeclaration; // Zod schema estandarizado
    execute(args: unknown, signal?: AbortSignal): Promise<ToolResult>;
  }
  ```
- Estandarizar `ToolResult`:
  ```ts
  interface ToolResult {
    content: string;
    metadata?: {
      durationMs: number;
      tokensUsed?: number;
      artifacts?: string[];  // paths de archivos creados
    };
    isError?: boolean;
    errorCode?: string;
  }
  ```
- Crear `ToolRegistry` con namespaces:
  ```ts
  registry.registerNamespace("filesystem", [bashTool, readTool, writeTool, ...]);
  registry.registerNamespace("mcp:github", [createIssueTool, listReposTool, ...]);
  registry.registerNamespace("factory", [createAgentTool, createProjectTool, ...]);
  ```
- Crear `Toolset` para grupos con ciclo de vida compartido (MCP connections, skill loaders)
- Crear `FunctionTool` factory que tome `(name, description, ZodSchema, executeFn)` y genere `BaseTool`
- Tipar `customTools` como `BaseTool[]` en `AgentRuntimeConfig` — eliminar `any`
- Implementar `AgentAsTool` para que un agente pueda ser invocado como tool desde otro agente (base de multi-agente composable)

### Arquitectura Propuesta

```
┌────────────────────────────────────────────────────────────┐
│                    ToolRegistry                             │
│                                                             │
│  Namespaces:                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ filesystem/  │  │ mcp:github/  │  │ factory/     │     │
│  │  bash        │  │  createIssue │  │  createAgent │     │
│  │  read        │  │  listRepos   │  │  createProj  │     │
│  │  write       │  │  getPR       │  │  ...         │     │
│  │  edit        │  └──────────────┘  └──────────────┘     │
│  │  ls          │                                          │
│  └──────────────┘                                          │
│                                                             │
│  Toolset = grupo con lifecycle:                            │
│  ┌─────────────────────────────────────────────┐           │
│  │ McpToolset("github")                        │           │
│  │   connect() → descubre tools del server     │           │
│  │   getTools() → tools actuales (puede variar) │           │
│  │   close() → desconecta proceso MCP          │           │
│  └─────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────┘

Crear una tool nueva (caso común — 3 líneas):
  import { FunctionTool } from "spaces-sdk";
  
  const weatherTool = new FunctionTool({
    name: "get_weather",
    description: "Obtiene el clima actual",
    schema: z.object({ city: z.string() }),
    execute: async ({ city }) => {
      const temp = await fetchWeather(city);
      return { content: `${city}: ${temp}°C` };
    },
  });
```

---

## Área 4: Capa de Abstracción de Servicios (Backends)

### Estado Actual

Spaces está acoplado al filesystem en prácticamente todas sus capas de persistencia:

```
Acoplamiento actual:
├── Sesiones    → JSONL en SPACES_DATA_PATH/<user>/sessions/<id>.jsonl
├── Artifacts   → archivos en <workspace>/files/
├── Memoria     → LocalMemoryProvider con archivos JSON
│                 (buena noticia: MemoryProvider es interfaz, solo hay 1 impl)
├── Config      → .spaces/config.json en el workspace
├── Auth        → SQLite vía better-auth (abstraído, difícil de cambiar)
└── MCP config  → mcp.json en el workspace
```

Lo positivo: `MemoryProvider` ya es una interfaz con dos implementaciones (`LocalMemoryProvider`, `NullMemoryProvider`). Esto demuestra que el patrón funciona. Lo negativo: es el único backend que está abstraído.

Para cambiar cualquier otro backend — PostgreSQL para sesiones, S3 para artifacts — hay que reescribir módulos enteros, no implementar interfaces.

### Lo que ADK Hace

ADK define interfaces abstractas para **cada servicio de infraestructura**:

```
BaseSessionService     → CRUD de sesiones
BaseArtifactService    → CRUD de artifacts (archivos, versiones)
BaseMemoryService      → búsqueda vectorial, CRUD de memorias
BaseCredentialService  → almacenamiento de API keys
BaseCodeExecutor       → ejecución de código (sandbox)
BaseContextCompactor   → compresión de historial

Implementaciones:
├── InMemory*        → para testing y desarrollo
├── File*            → filesystem local
├── Gcs*             → Google Cloud Storage
├── MikroORM*        → PostgreSQL / MySQL / SQLite / MSSQL / MongoDB
└── VertexAi*        → servicios cloud de Google
```

La inyección ocurre en el `Runner`: cada implementación se pasa como dependencia. Cambiar de filesystem a PostgreSQL es cambiar 3 líneas en la configuración del Runner, no reescribir código.

### Lo que Spaces Necesita

El patrón ya existe para memoria. Hay que extenderlo a las otras capas:

**Lo que falta:**
- Definir interfaces:
  ```ts
  interface ISessionStore {
    create(session: SessionData): Promise<void>;
    appendMessage(sessionId: string, message: Message): Promise<void>;
    getMessages(sessionId: string, limit?: number): Promise<Message[]>;
    listUserSessions(username: string): Promise<SessionSummary[]>;
    delete(sessionId: string): Promise<void>;
  }

  interface IArtifactStore {
    save(sessionId: string, filename: string, content: Buffer): Promise<string>;
    read(path: string): Promise<Buffer>;
    list(prefix: string): Promise<ArtifactMetadata[]>;
    delete(path: string): Promise<void>;
    getUrl(path: string): Promise<string>; // signed URL para S3/GCS
  }

  interface IMemoryStore {
    add(memory: MemoryEntry): Promise<void>;
    search(query: string, limit?: number): Promise<MemoryEntry[]>;
    delete(id: string): Promise<void>;
    listTags(): Promise<string[]>;
  }
  ```
- Extraer implementaciones filesystem actuales detrás de estas interfaces:
  - `FileSessionStore` (hoy: `session-lister.ts` + lógica en `session-manager.ts`)
  - `FileArtifactStore` (hoy: operaciones directas de fs en `files.ts` routes)
  - `LocalMemoryStore` (ya existe como `LocalMemoryProvider`, renombrar)
- Crear implementaciones in-memory para testing:
  - `MemorySessionStore` (Map en memoria)
  - `MemoryArtifactStore` (Map de Buffers)
  - Permite tests de integración sin tocar disco
- Diseñar mecanismo de inyección de dependencias:
  ```ts
  // Configuración del SpacesHost
  const host = new ServerSpacesHost({
    sessionStore: usePostgres ? new PostgresSessionStore(pool) : new FileSessionStore(dataPath),
    artifactStore: useS3 ? new S3ArtifactStore(bucket) : new FileArtifactStore(dataPath),
    memoryStore: new LocalMemoryStore(dataPath),
  });
  ```
- Planificar backends futuros (no implementar todavía):
  - `PostgresSessionStore`: sesiones en PostgreSQL con búsqueda full-text
  - `S3ArtifactStore`: artifacts en S3-compatible storage
  - `PineconeMemoryStore` / `PgVectorMemoryStore`: memoria vectorial para búsqueda semántica

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                   SpacesHost.configure()                     │
│                                                              │
│  stores: {                                                   │
│    session: ISessionStore   ←──┐                             │
│    artifact: IArtifactStore ←──┼── Cada uno con N impls     │
│    memory: IMemoryStore     ←──┤                             │
│  }                            │                              │
└───────────────────────────────┼──────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ File*Store   │  │ Memory*Store     │  │ Postgres*Store   │
│ (producción  │  │ (testing / dev)  │  │ (producción      │
│  actual)     │  │                  │  │  futura)         │
│              │  │  Implementación  │  │                   │
│ JSONL en     │  │  en RAM.        │  │  Schemas en Drizzle│
│ filesystem   │  │  Rápida, volátil│  │  Migraciones      │
└──────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Área 5: Empaquetado como SDK

### Estado Actual

`apps/server` es una **aplicación**, no una **librería**. Esto es la diferencia entre un producto cerrado y una plataforma:

```
apps/server/package.json actual:
{
  "name": "server",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts --outdir ./dist --target bun"
  },
  "dependencies": { ... }
  // ❌ No tiene: "main", "module", "exports", "types", "files"
}
```

El build actual (`bun build src/index.ts`) produce un bundle monolítico. No exporta símbolos. No es importable desde otro proyecto con `import { createAgentRuntime } from "spaces-sdk"`.

`ARCHITECTURE.md` menciona `SpacesHost` y `createAgentRuntime` como puntos de extensión, pero no hay manera de consumirlos sin clonar el repositorio entero.

El core está _lógicamente_ desacoplado (puertos, interfaces, `SpacesHost`) pero _físicamente_ inaccesible.

### Lo que ADK Hace

ADK se publica como **3 paquetes npm** con un `exports` map de 300+ símbolos:

```
@google/adk
├── package.json
│   ├── "main": "./dist/cjs/index.js"
│   ├── "module": "./dist/esm/index.js"
│   ├── "types": "./dist/types/index.d.ts"
│   └── "exports": {
│       ".": { import, require, types },
│       "./tools": { ... },
│       "./plugins": { ... },
│       "./models": { ... }
│     }
├── build pipeline:
│   ├── tsc --emitDeclarationOnly  → tipos
│   ├── esbuild / tsup             → ESM + CJS bundles
│   └── prepublishOnly hook        → build + test pre-publicación
└── versioning: release-please (automated conventional commits → semver)
```

El paquete `@google/adk-devtools` incluye CLI para development. El paquete `@google/adk-integrations` provee conectores externos (Slack, GitHub, etc.).

### Lo que Spaces Necesita

**Lo que falta:**
- Crear `packages/spaces-sdk` con `package.json` completo:
  ```json
  {
    "name": "spaces-sdk",
    "version": "0.1.0",
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
      ".": {
        "import": "./dist/index.js",
        "require": "./dist/index.cjs",
        "types": "./dist/index.d.ts"
      },
      "./tools": {
        "import": "./dist/tools/index.js",
        "types": "./dist/tools/index.d.ts"
      },
      "./plugins": {
        "import": "./dist/plugins/index.js",
        "types": "./dist/plugins/index.d.ts"
      },
      "./host": {
        "import": "./dist/host/index.js",
        "types": "./dist/host/index.d.ts"
      }
    },
    "files": ["dist", "README.md", "LICENSE"]
  }
  ```
- Definir la superficie pública de la API:
  ```
  spaces-sdk
  ├── createAgentRuntime()         → la factory principal
  ├── SpacesHost (interface)       → contrato de integración
  ├── BasePlugin                   → interfaz de plugin
  ├── BaseLlmProvider              → interfaz de provider
  ├── BaseTool, FunctionTool       → abstracciones de tools
  ├── ToolRegistry                 → registro de tools
  ├── ISessionStore, IArtifactStore, IMemoryStore → interfaces de backend
  └── Tipos públicos:
      ├── AgentRuntimeConfig, AgentRuntimeInstance
      ├── ToolDeclaration, ToolResult
      ├── LlmRequest, LlmResponse
      └── PluginContext, HookResult
  ```
- Configurar build pipeline:
  - `tsup` o `unbuild` para ESM + CJS + types
  - `tsc --emitDeclarationOnly` para tipos (sin bundling de tipos — `unbuild` lo maneja)
  - `prepublishOnly`: `pnpm build && pnpm test`
- Crear `packages/spaces-devtools` (futuro):
  - CLI: `npx spaces init`, `npx spaces dev`, `npx spaces build`
  - Herramientas de debugging: inspeccionar sesiones, probar plugins, validar config
- Configurar Changesets para versionado semver automatizado:
  ```
  .changeset/
  ├── config.json
  └── *.md  → changelog entries
  ```
- Generar documentación con TypeDoc:
  - `pnpm --filter spaces-sdk run docs` → `docs.sdk.spaces.dev`
- Crear proyecto externo de ejemplo como integration test:
  ```
  examples/
  ├── minimal-host/     → SpacesHost mínimo (100 líneas)
  ├── custom-plugin/    → un plugin externo que agrega una tool
  └── custom-provider/  → un provider para Ollama o LiteLLM
  ```
- Publicar el paquete (decisión de distribución):
  - npm público (`spaces-sdk`) para open source
  - GitHub Packages para consumo interno
  - Ambos con CI/CD automatizado (merge a main → release)

### Arquitectura Propuesta

```
packages/spaces-sdk/
├── package.json          # "spaces-sdk" con exports map
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts          # Re-exporta la superficie pública
│   ├── runtime/
│   │   ├── agent-runtime.ts     # createAgentRuntime()
│   │   └── types.ts
│   ├── host/
│   │   └── spaces-host.ts       # SpacesHost interface
│   ├── plugins/
│   │   ├── base-plugin.ts       # BasePlugin
│   │   ├── plugin-manager.ts    # PluginManager
│   │   └── built-in/
│   │       ├── audit-log.plugin.ts
│   │       └── ws-notify.plugin.ts
│   ├── tools/
│   │   ├── base-tool.ts         # BaseTool interface
│   │   ├── function-tool.ts     # FunctionTool factory
│   │   ├── tool-registry.ts
│   │   ├── tool-result.ts       # ToolResult envelope
│   │   └── toolset.ts           # BaseToolset
│   ├── models/
│   │   ├── base-provider.ts     # BaseLlmProvider
│   │   └── llm-registry.ts
│   └── stores/
│       ├── session-store.ts     # ISessionStore
│       ├── artifact-store.ts    # IArtifactStore
│       └── memory-store.ts      # IMemoryStore
├── CHANGELOG.md
└── README.md
```

---

## Resumen: los 5 pilares de extensibilidad

```
Extensibilidad de Spaces — el mapa completo:

1. Plugin System ────────► BasePlugin + PluginManager + registro por directorio
   │                        Los hooks dejan de ser callbacks cableados y pasan a ser
   │                        plugins intercambiables con prioridad y short-circuit.
   │
2. Model Providers ──────► BaseLlmProvider + LLMRegistry + formato declarativo
   │                        De 9 register*Provider() hardcodeados a una interfaz
   │                        estándar que cualquier provider puede implementar.
   │
3. Tool Abstraction ─────► BaseTool + ToolRegistry + namespaces + FunctionTool
   │                        De objetos planos { name, description, schema, execute }
   │                        a una jerarquía tipada con Toolset para lifecycle groups.
   │
4. Service Abstraction ───► ISessionStore, IArtifactStore, IMemoryStore + DI
   │                        Del acoplamiento total a filesystem a backends
   │                        intercambiables (filesystem, in-memory, Postgres, S3).
   │
5. SDK Packaging ────────► packages/spaces-sdk con exports map, ESM + CJS + types
                           De una aplicación cerrada a una librería versionada que
                           cualquiera puede instalar con npm install spaces-sdk.
```

---

## Dependencias Entre Áreas

No todas las áreas son independientes. Hay un orden natural dictado por dependencias arquitectónicas:

```
Dependencias:
  Plugin System ───────────── depende de ──► Tool Abstraction (plugins pueden
  │                                          agregar/quitar tools)
  │
  │                                         Service Abstraction (plugins pueden
  │                                          interceptar sesiones/artifacts)
  │
  │                                         SDK Packaging (el BasePlugin se expone
  │                                          en el SDK)
  │
  Model Providers ────────── depende de ──► SDK Packaging (BaseLlmProvider se
  │                                          expone en el SDK)
  │
  Tool Abstraction ───────── depende de ──► SDK Packaging (BaseTool, FunctionTool,
  │                                          ToolRegistry se exponen en el SDK)
  │
  Service Abstraction ────── depende de ──► SDK Packaging (interfaces de store se
  │                                          exponen en el SDK)
  │
  SDK Packaging ──────────── es el habilitador de todo lo demás.
                             Sin SDK empaquetado, las abstracciones existen en
                             TypeScript pero ningún externo puede consumirlas.
```

**Orden lógico de implementación:**
1. **Service Abstraction** (extraer interfaces de stores) — es el refactor más interno, no rompe nada
2. **Tool Abstraction** (BaseTool + ToolRegistry) — estandariza lo que ya existe
3. **Model Providers** (BaseLlmProvider + LLMRegistry) — desacopla providers del monolito
4. **Plugin System** (BasePlugin + PluginManager) — consume las 3 abstracciones anteriores
5. **SDK Packaging** — empaqueta todo lo anterior para consumo externo

---

## Riesgos y Puntos de Fricción

| Riesgo | Área | Mitigación |
|---|---|---|
| Romper compatibilidad de tools existentes al tipar `BaseTool` | Tool Abstraction | Crear adaptador `legacyToolToBaseTool()` que wrappea objetos planos. Migración progresiva, no big-bang. |
| Providers que no encajan en `BaseLlmProvider` (ej: OpenRouter con routing dinámico) | Model Providers | La interfaz debe ser mínima. Si un provider necesita comportamiento extra, que lo haga internamente. `matchModel()` con regex da flexibilidad. |
| Plugins que necesitan estado (no son stateless) | Plugin System | El `PluginManager` debe soportar `initialize()` y `shutdown()` en cada plugin. El estado vive en el plugin, no en el manager. |
| El SDK expone `vendor/` internamente | SDK Packaging | El exports map debe ser explícito — solo lo que está en el `exports` de package.json es público. `vendor/` no se re-exporta. |
| Cambiar el store sin migrar datos existentes (filesystem → Postgres) | Service Abstraction | Las interfaces deben incluir `migrate(from: I*Store, to: I*Store)`. El cambio de backend es una operación explícita, no automágica. |
| CI/CD de publicación: "rompí el SDK sin darme cuenta" | SDK Packaging | Contract tests: una suite que importa `spaces-sdk` y verifica que todos los exports públicos existen y tienen la firma esperada. Corre en CI en cada PR. |

---

## Prioridad

**El SDK Packaging (Área 5) es el habilitador crítico.** Todo lo demás — plugins, providers, tools, stores — son abstracciones que ya existen en el código pero no son accesibles desde afuera. Sin un paquete versionado con exports map, las otras 4 áreas son refactors internos útiles pero no cambian el modelo de extensibilidad.

**Segundo: Service Abstraction (Área 4).** Es el refactor de menor riesgo y mayor retorno inmediato: las interfaces de store existen conceptualmente, solo falta extraerlas y crear las implementaciones in-memory para testing. Esto desbloquea testing automatizado para el resto de las áreas.

**Tercero: Tool Abstraction (Área 3).** Estandarizar tools elimina el `any` de la firma pública de `createAgentRuntime()` y permite que el plugin system manipule tools de forma genérica.

**Cuarto: Model Providers (Área 2).** Desacoplar providers es importante para el ecosistema pero es menos urgente que tools (los providers ya funcionan, aunque frágiles).

**Quinto: Plugin System (Área 1).** Es la joya de la corona — lo que el mercado ve como "extensibilidad". Pero solo brilla si las 4 áreas anteriores están sólidas. Construir plugins sobre `any` y objetos planos es pintar una casa sin cimientos.

---

## Pregunta que hay que responder antes de empezar

**¿Cuál es el modelo de distribución del SDK?**

- **Open source (npm público):** `spaces-sdk` en npm, licencia MIT/Apache 2.0, cualquiera puede instalar. Prioriza documentación, ejemplos, y CI/CD de publicación impecable desde el día 1.
- **Source-available (GitHub público, sin npm):** el código es visible pero el consumo es vía git dependency. Menos fricción de publicación, más fricción de adopción.
- **Internal only (monorepo privado):** el SDK existe como workspace de pnpm pero no se publica externamente. Las abstracciones son para consumo interno y ordenar el código.

Esta decisión determina cuánta inversión va a CI/CD de publicación, documentación pública y ejemplos externos versus cuánta va a las abstracciones internas.
