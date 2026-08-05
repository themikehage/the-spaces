# AGENTS.md — Auto-Browser

Motor de agentes de IA extensible y desacoplado desde el día 0. Chat + sesiones como superficie mínima, arquitectura limpia para escalar a producción.

## Mandatory Context Files

Antes de cualquier trabajo, leé en orden:

1. `AGENTS.md` — este archivo (patrones innegociables, reglas de integridad)
2. `PLAN.md` — arquitectura completa, fases de implementación, diseño detallado

Son la única fuente de verdad del proyecto.

## Workflow

1. Leé los 2 MDs de arriba
2. Identificá la fase y tarea a implementar de `PLAN.md` §5
3. Implementá la tarea completa
4. Ejecutá `pnpm typecheck` en el paquete afectado **antes de declarar terminado**
5. Si la tarea completa una fase, ejecutá `pnpm build` en todos los paquetes
6. Commiteá con mensaje convencional: `feat(engine): implement AgentRuntime`, `fix(core): correct ISessionStore signature`
7. Actualizá `PLAN.md` marcando la tarea como completada

## Patrones de Arquitectura — Innegociables

Estos patrones son ley. Ningún cambio los puede violar. Si un feature nuevo requiere romper un patrón, el diseño del feature está mal.

### 1. Composición sobre herencia — cero god objects

`AgentRuntime` es una clase fina que **compone** módulos inyectados por constructor. Cada módulo es una interfaz en `packages/core/src/ports/` y se implementa en su paquete.

```ts
// CORRECTO: dependencias inyectadas
class AgentRuntime {
  constructor(
    private model: IModelProvider,
    private tools: IToolExecutor,
    private prompts: IPromptBuilder,
    private hooks: IHookRunner,
    private permissions: IPermissionEngine,
    private store: ISessionStore,
  ) {}
}

// INCORRECTO: dios todopoderoso que lo sabe todo
class AgentSession {
  private toolRegistry: ToolRegistry;
  private promptBuilder: PromptBuilder;
  private compactionManager: CompactionManager;
  private navigationController: NavigationController;
  private eventBus: TypedEventEmitter;
  // ... 800 líneas más
}
```

### 2. Tipos de agente como fábricas — nunca herencia de clases

Los tipos de agente (global, project, team — cuando existan) son la **misma clase** `AgentRuntime` con distintas dependencias inyectadas. La factory arma la composición.

```ts
// CORRECTO: factory que compone
function createGlobalAgent(cfg) {
  return new AgentRuntime({
    tools: defaultToolRegistry,
    hooks: [],
  });
}

function createProjectAgent(cfg) {
  return new AgentRuntime({
    tools: defaultToolRegistry.extend(projectTools),
    sandbox: new LocalSandbox(cfg.workspaceDir),
    hooks: [workspaceHook],
  });
}

// INCORRECTO: jerarquía de herencia
class ProjectAgent extends BaseAgent { ... }
class TeamAgent extends BaseAgent { ... }
```

### 3. Prompt pipeline por secciones — no lógica spaghetti

El system prompt se arma como un pipeline de `PromptSection[]` ordenadas por `priority`. Cada sección decide si se incluye con `condition()`. El builder no cambia cuando se agregan skills, rules, o memorias — solo se registran secciones nuevas.

```ts
interface PromptSection {
  id: string;
  priority: number;
  condition?: (ctx: AgentContext) => boolean;
  render(ctx: AgentContext): Promise<string>;
}

// Prioridades fijas:
//   0: SystemIdentity
//  10: Rules
//  20: Context
//  30: Memory
//  40: Tools
//  50: Format
```

### 4. Hooks como middleware chain — no callbacks sueltos

Los hooks forman una cadena de middleware con capacidad de **short-circuit** (`null` bloquea). Se ejecutan en orden de `priority`.

```ts
interface Hook {
  id: string;
  priority: number;
  beforeToolCall?(ctx: ToolCallContext): Promise<ToolCallContext | null>;
  afterToolCall?(ctx: ToolCallContext, result: ToolResult): Promise<ToolResult>;
  onError?(error: AgentError): Promise<void>;
}
```

- `null` en `beforeToolCall` = la tool no se ejecuta (approval deny, sandbox block)
- `null` en `afterToolCall` = el resultado se descarta
- Los hooks son **imperativos** (hacen cosas: loguear, auditar, enriquecer)

### 5. Rules como constraints declarativos — separados de hooks

Las rules son **declarativas**: solo evalúan y devuelven `{ allowed: boolean }`. El `PermissionEngine` las ejecuta antes de cada tool call. No hacen side effects.

```ts
interface Rule {
  id: string;
  description: string;
  evaluate(ctx: RuleContext): { allowed: boolean; reason?: string };
}
```

- Las rules se pueden cargar desde archivos `.rules/`
- Las rules no conocen hooks, los hooks no conocen rules
- El engine es el único que orquesta ambos

### 6. Tool registry como contrato tipado — Zod desde el día 0

Toda tool implementa `ITool` con schema Zod obligatorio. El registry convierte automáticamente a formato LLM.

```ts
interface ITool {
  name: string;
  description: string;
  parameters: ZodSchema;
  category?: string;
  requiresApproval?: boolean;
  execute(args: unknown, ctx: ToolContext): Promise<ToolResult>;
}
```

- Nunca inventar tool calls inline sin schema
- Nunca hardcodear tools en el agent loop
- Siempre usar `toolRegistry.toLLMFormat()` para enviar al modelo

### 7. Sandbox y workspace como dependencias inyectables

El agente nunca ejecuta comandos directamente. Usa `ISandbox` y `IWorkspaceProvider` inyectados. El MVP usa `LocalSandbox`, pero la interfaz permite cambiarlo por Docker, remoto, o mock sin tocar el core.

```ts
interface ISandbox {
  execute(cmd: string, opts?: SandboxOptions): Promise<SandboxResult>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(pattern: string): Promise<string[]>;
}
```

## Reglas de Integridad del Código

| Regla                    | Umbral       | Acción al violar                                   |
| ------------------------ | ------------ | -------------------------------------------------- |
| Tamaño máximo de clase   | 200 líneas   | Extraer submódulo con responsabilidad única        |
| Tamaño máximo de archivo | 300 líneas   | Dividir en módulos especializados                  |
| Singletons               | 0 tolerancia | Inyectar por constructor o AppContext              |
| `any` types              | 0 tolerancia | Usar `unknown` + type guard o generic              |
| Dependencias circulares  | 0 tolerancia | Invertir dependencia con interfaz en `core/ports/` |
| Hardcodeo de providers   | 0 tolerancia | Registrar en `ProviderRegistry`                    |
| Hardcodeo de tools       | 0 tolerancia | Registrar en `IToolRegistry`                       |
| Schemas monolíticos      | 0 tolerancia | Colocar schemas junto al dominio que los define    |

Verificación obligatoria antes de commit:

```bash
pnpm typecheck          # 0 errores
pnpm lint               # 0 errores
pnpm --filter <pkg> build  # build exitoso del paquete afectado
```

## Estructura de Paquetes

```
auto-browser/
├── packages/
│   ├── core/            # Interfaces puras — CERO implementaciones, CERO dependencias externas
│   ├── engine/          # Implementación del runtime (depende solo de core)
│   ├── tools/           # Implementaciones de ITool (depende solo de core)
│   ├── providers/       # Implementaciones de IModelProvider (depende solo de core)
│   ├── sandbox/         # Implementaciones de ISandbox (depende solo de core)
│   └── storage/         # Implementaciones de ISessionStore (depende solo de core)
├── apps/
│   ├── server/          # Hono + Bun (depende de engine, tools, providers, sandbox, storage)
│   └── client/          # React + Vite + Tailwind v4 (independiente, solo REST + WS)
└── PLAN.md              # Arquitectura completa y fases
```

**Regla de dependencia**: `packages/core` no importa de nadie. Los demás paquetes solo importan de `core`. Las apps importan de los paquetes. Nunca al revés.

## Code Conventions

- TypeScript strict mode (`strict: true`, `noImplicitAny`, `strictNullChecks`)
- Nada de `any` — usar `unknown` con type guards
- Zod para validación de contratos — schemas en `packages/core/src/schemas/`
- Interfaces con prefijo `I` (`IAgentRuntime`, `ITool`, `ISessionStore`)
- Tipos sin prefijo (`AgentContext`, `ToolResult`, `MessageDelta`)
- No comments innecesarios — el código se documenta solo. Solo comentar el _por qué_, nunca el _qué_
- Functional components + hooks en React
- Tailwind CSS v4, custom values en `@theme` dentro de `index.css`
- Imports ordenados por: built-in → externos → internos (paquete actual) → relativos

## Stack

- **Runtime:** Bun
- **Server:** Hono + `hono/bun` WebSocket
- **Tipado:** TypeScript strict + Zod
- **Frontend:** React 19 + Vite 6 + Tailwind CSS v4
- **Monorepo:** pnpm workspaces + Turborepo
- **Linting:** ESLint v9 flat config + Prettier

## Commands

```bash
pnpm dev                        # Server + client en paralelo
pnpm build                      # Build de todos los paquetes y apps
pnpm typecheck                  # TypeScript strict check en todo el workspace
pnpm lint                       # ESLint flat config
pnpm format                     # Prettier

pnpm --filter @auto-browser/server dev       # Solo server (watch mode)
pnpm --filter @auto-browser/client dev       # Solo client (Vite HMR)
pnpm --filter @auto-browser/core typecheck   # Typecheck de un paquete específico
pnpm --filter @auto-browser/engine build     # Build de un paquete específico
```
