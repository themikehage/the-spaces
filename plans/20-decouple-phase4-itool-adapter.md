# Plan 20 — Fase 4: `ITool` desacoplado del vendor

> Rama: `feat/decouple-agent-runtime`
> Riesgo: 🟠 Medio-alto — cambia el tipo base del ToolRegistry, requiere adaptador
> Depende de: Planes 17, 18, 19 completados

## Objetivo

Hacer que las tools del server no dependan del tipo `AgentTool` del vendor interno. El `ToolRegistry` pasa a operar con `ITool` (interfaz propia del core). Un adaptador delgado convierte `ITool → AgentTool` justo antes de pasar las tools al vendor loop.

## Contexto

### Estado actual

`ToolRegistry` en `apps/server/src/core/tool-registry.ts`:

```ts
import type { AgentTool } from "../ai/vendor/agent/src/types.ts";

export class ToolRegistry {
  private activeTools: AgentTool[] = [];
  private allToolsMap: Map<string, AgentTool> = new Map();
  // ...
}
```

`AgentSession` llama a `toolRegistry.getActiveTools()` y pasa el resultado directo al vendor `Agent`.

### Diferencia de firmas (investigada)

|                    | `AgentTool` (vendor)                       | `ITool` (core port)                      |
| ------------------ | ------------------------------------------ | ---------------------------------------- |
| `execute` args     | `(toolCallId, params, signal?, onUpdate?)` | `(toolCallId, params, ctx: ToolContext)` |
| `label`            | requerido                                  | requerido                                |
| `executionMode`    | opcional                                   | no existe (se puede agregar después)     |
| `prepareArguments` | opcional                                   | no existe                                |

El adaptador es trivial — solo re-empaqueta `signal` y `onUpdate` en `ToolContext`.

## Archivos a crear

### `apps/server/src/core/ports/tool.port.ts` [NEW]

Basado en el auto-browser `packages/core/src/ports/tool.port.ts`, adaptado al contexto:

```ts
import type { TSchema, Static } from "typebox";

export interface ToolContext {
  sessionId: string;
  toolCallId: string;
  signal?: AbortSignal;
  onUpdate?: (partial: ToolResult) => void;
}

export interface ToolResult {
  content: Array<
    { type: "text"; text: string } | { type: "image"; mediaType: string; data: string }
  >;
  details: unknown;
  terminate?: boolean;
}

export interface ITool<TParams extends TSchema = TSchema, TDetails = unknown> {
  readonly name: string;
  readonly description: string;
  readonly label: string;
  readonly parameters: TParams;
  readonly category?: string;
  readonly requiresApproval?: boolean;

  execute(
    toolCallId: string,
    params: Static<TParams>,
    ctx: ToolContext,
  ): Promise<ToolResult & { details: TDetails }>;
}

export interface IToolRegistry {
  register(tool: ITool): void;
  get(name: string): ITool | undefined;
  list(filter?: { category?: string }): ITool[];
  getActive(): ITool[];
  setActive(tools: ITool[]): void;
  clear(): void;
}
```

### `apps/server/src/core/tool-adapters.ts` [NEW]

Adaptador bidireccional. El vendor sigue recibiendo `AgentTool[]` — el adaptador convierte justo en el boundary.

```ts
import type { AgentTool } from "../ai/vendor/agent/src/types";
import type { ITool } from "./ports/tool.port";

export function iToolToAgentTool(tool: ITool): AgentTool {
  return {
    name: tool.name,
    label: tool.label,
    description: tool.description,
    parameters: tool.parameters,
    execute: (toolCallId, params, signal, onUpdate) =>
      tool.execute(toolCallId, params, {
        sessionId: "", // se inyecta en AgentSession al invocar
        toolCallId,
        signal,
        onUpdate,
      }),
  };
}
```

## Archivos a modificar

### `apps/server/src/core/tool-registry.ts` [MODIFY]

- Cambiar de `AgentTool` a `ITool` como tipo base
- Agregar `toAgentTools(): AgentTool[]` que mapea con `iToolToAgentTool`
- Mantener la API pública existente (`registerTool`, `getTool`, `getActiveTools`, etc.) con los nombres actuales como aliases

### `apps/server/src/ai/agent-session.ts` [MODIFY]

- En `initializeAgent()` / `_refreshToolRegistry()`: cambiar la línea que pasa tools al vendor:
  ```ts
  // Antes
  tools: this.toolRegistry.getActiveTools();
  // Después
  tools: this.toolRegistry.toAgentTools();
  ```
- El `_refreshToolRegistry()` que wrappea `AgentTool` ad-hoc se refactoriza para crear `ITool` y registrarlos directamente

### `apps/server/src/core/default-factory-skills.ts` [MODIFY]

- Las tools creadas aquí que actualmente son `AgentTool` se convierten a `ITool`
- Son las más numerosas — revisar una por una

## Checklist

- [ ] Crear `tool.port.ts`
- [ ] Crear `tool-adapters.ts` con `iToolToAgentTool`
- [ ] `ToolRegistry` refactorizado a `ITool` con `toAgentTools()` adapter
- [ ] `AgentSession._refreshToolRegistry()` usa `ITool` nativo
- [ ] `AgentSession.initializeAgent()` llama a `toAgentTools()` antes de pasar al vendor
- [ ] `default-factory-skills.ts` actualizado
- [ ] `pnpm --filter server run typecheck` sin errores

## Verificación

```bash
pnpm --filter server run typecheck
```

Smoke test: verificar que tools como `bash`, `read_file`, `write_file` siguen ejecutándose correctamente.

## Notas

- El `sessionId` en `ToolContext` se puede inyectar correctamente en `AgentSession` una vez que `IAgentRuntime.sessionId` esté disponible (Fase 1)
- Si alguna tool usa features específicas de `AgentTool` (`prepareArguments`, `executionMode`), se mantiene como `AgentTool` directa con un comentario `// TODO: migrate to ITool`
