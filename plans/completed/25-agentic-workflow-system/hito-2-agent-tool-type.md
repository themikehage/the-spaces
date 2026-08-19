# Hito 25.2 — Custom Tool Type `"agent"`

**Estado:** 📋 Planificado  
**Dependencias:** Hito 25.1 (outputs tipados)  
**Desbloquea:** Hito 25.3

---

## Objetivo

Agregar un nuevo tipo de ejecución `"agent"` en `CustomToolDefinition` que permita definir declarativamente qué agente invocar, con qué contexto, y cómo capturar su output. Esto convierte las custom tools en ciudadanos de primera clase del sistema de orquestación — el agente global puede invocar subagentes via pipeline sin escribir código.

---

## Diagnóstico — Estado actual

### Lo que SÍ funciona

| Aspecto                                                | Estado | Detalle                                                               |
| ------------------------------------------------------ | ------ | --------------------------------------------------------------------- |
| `ExecutionPipelineSchema` encadena tool calls          | OK     | `schemas.ts` — `steps: PipelineStep[]` con `tool`, `params`, `output` |
| `createCustomToolRuntime` ejecuta pipelines            | OK     | `runtime.ts` — case `"pipeline"` usa `executePipeline()`              |
| `PipelineContext` tiene `username`, `sessionId`, `cwd` | OK     | `pipeline-engine.ts` — contexto de ejecución                          |
| `manage_delegations` hace spawn/delegate               | OK     | `manage-delegations.tool.ts` — usa `DelegationRegistry`               |

### Lo que NO funciona (gaps)

| Gap                                                         | Impacto                                                  | Ubicación                 |
| ----------------------------------------------------------- | -------------------------------------------------------- | ------------------------- |
| `execute.type` solo acepta `"pipeline"` o `"ui"`            | No se puede definir un step que spawne un agente         | `schemas.ts:243-246`      |
| `pipeline-engine.ts` no tiene acceso a `DelegationRegistry` | Un pipeline no puede crear delegaciones                  | `pipeline-engine.ts`      |
| `PipelineContext` no inyecta `delegationRegistry`           | No hay forma de pasar el registry al runtime de pipeline | `pipeline-engine.ts:1-20` |
| `createCustomToolRuntime` no recibe `delegationRegistry`    | El runtime no puede iniciar delegaciones                 | `runtime.ts:8-11`         |

---

## Diseño

### 1. Nuevo schema `ExecutionAgentSchema`

```typescript
// core/custom-tools/schemas.ts

export const ExecutionAgentSchema = z.object({
  type: z.literal("agent"),
  /** ID del agente a invocar. Si es "spawn", crea un subagente anónimo */
  agentId: z.string().optional(),
  /**
   * Plantilla de tarea. Soporta interpolación de variables del scope del pipeline.
   * Ejemplo: "Analiza el archivo {{filePath}} y devuelve un JSON con los errores"
   */
  taskTemplate: z.string().min(10),
  /** Tipo de subagente: explorer (read-only), builder (confirmación), autonomous */
  subagentType: z.enum(["explorer", "builder", "autonomous"]).default("builder"),
  /** Nombre de la variable donde se captura el output del subagente */
  captureOutputAs: z.string().optional(),
  /** Si true, espera a que el subagente termine antes de continuar */
  waitForCompletion: z.boolean().default(true),
  /** Máximo de steps del subagente */
  maxSteps: z.number().min(1).max(50).default(15),
});

export type ExecutionAgent = z.infer<typeof ExecutionAgentSchema>;

// Actualizar ExecutionModeSchema:
export const ExecutionModeSchema = z.discriminatedUnion("type", [
  ExecutionPipelineSchema,
  ExecutionUiSchema,
  ExecutionAgentSchema, // ← nuevo
]);
```

### 2. Extensión de `PipelineContext` con `delegationRegistry`

```typescript
// core/custom-tools/pipeline-engine.ts

import type { DelegationRegistry } from "../delegation/delegation-registry";

export interface PipelineContext {
  cwd: string;
  session: IAgentRuntime | null;
  username: string;
  sessionId: string;
  delegationRegistry?: DelegationRegistry; // ← nuevo
}
```

### 3. Nuevo case `"agent"` en `createCustomToolRuntime`

```typescript
// core/custom-tools/runtime.ts

case "agent": {
  const { agentId, taskTemplate, subagentType, captureOutputAs, waitForCompletion, maxSteps } = executeDef;

  // Resolver variables del scope actual en la taskTemplate
  const resolvedTask = resolveVariables(taskTemplate, context.scope ?? {});

  // Necesitamos sessionManager para crear la sesión del subagente
  const { sessionManager } = await import("../session/session-manager");
  const { delegationRegistry } = await import("../delegation/delegation-registry");

  const toolCallId = `custom-tool-agent-${Date.now()}`;

  // Usar manage_delegations internamente
  const spawnResult = await spawnSubagent({
    toolCallId,
    username: context.username,
    parentSessionId: context.sessionId,
    agentId: agentId ?? undefined,
    task: resolvedTask,
    subagentType: subagentType ?? "builder",
    maxSteps: maxSteps ?? 15,
    waitForCompletion: waitForCompletion ?? true,
    sessionManager,
    delegationRegistry,
  });

  const outputs = spawnResult.outputs ?? {};

  // Si se pidió capturar el output, lo guardamos en el scope del pipeline
  if (captureOutputAs) {
    return {
      content: [{ type: "text", text: spawnResult.executive_summary }],
      details: { capturedAs: captureOutputAs, value: outputs },
      pipelineScopeUpdate: { [captureOutputAs]: spawnResult.executive_summary, ...outputs },
      isError: spawnResult.status === "error",
    };
  }

  return {
    content: [{ type: "text", text: spawnResult.executive_summary }],
    isError: spawnResult.status === "error",
  };
}
```

### 4. Helper `spawnSubagent` (extrae lógica de `manage-delegations.tool.ts`)

Para evitar duplicación, se extrae la lógica core de spawn en un helper puro en `core/session/agent-utils.ts`:

```typescript
// core/session/agent-utils.ts

export interface SpawnSubagentParams {
  toolCallId: string;
  username: string;
  parentSessionId: string;
  agentId?: string;
  task: string;
  subagentType: "explorer" | "builder" | "autonomous";
  maxSteps: number;
  waitForCompletion: boolean;
  sessionManager: typeof import("../session/session-manager").sessionManager;
  delegationRegistry: DelegationRegistry;
}

export async function spawnSubagent(params: SpawnSubagentParams): Promise<EnvelopeResult> {
  // Lógica extraída de manage-delegations.tool.ts action === "spawn"
  // Retorna EnvelopeResult con outputs tipados (Hito 25.1)
}
```

### 5. Propagación del `pipelineScopeUpdate` en `executePipeline`

```typescript
// pipeline-engine.ts — en el loop de steps

const result = await tool.execute(toolCallId, resolvedParams, signal, onUpdate);

// Si el tool devuelve updates de scope (case "agent"), propagar al scope del pipeline
if (result.pipelineScopeUpdate) {
  Object.assign(scope, result.pipelineScopeUpdate);
}

if (step.output) {
  scope[step.output] = result.content?.[0]?.text ?? "";
}
```

---

## Archivos afectados

| Archivo                                | Operación | Descripción                                                                      |
| -------------------------------------- | --------- | -------------------------------------------------------------------------------- |
| `core/custom-tools/schemas.ts`         | MODIFY    | Agregar `ExecutionAgentSchema`, actualizar `ExecutionModeSchema`                 |
| `core/custom-tools/pipeline-engine.ts` | MODIFY    | Agregar `delegationRegistry` a `PipelineContext`, propagar `pipelineScopeUpdate` |
| `core/custom-tools/runtime.ts`         | MODIFY    | Nuevo case `"agent"` que invoca `spawnSubagent`                                  |
| `core/session/agent-utils.ts`          | MODIFY    | Extraer helper `spawnSubagent` reutilizable                                      |
| `packages/shared/src/tools-catalog.ts` | MODIFY    | Actualizar tipos si hay referencias al schema de ejecución                       |

---

## Ejemplo de uso (custom tool tipo "agent")

```json
{
  "name": "analyze_codebase",
  "description": "Spawna un agente explorer para analizar el codebase y devolver métricas",
  "parameters": {
    "type": "object",
    "properties": {
      "path": { "type": "string" }
    },
    "required": ["path"]
  },
  "execute": {
    "type": "agent",
    "subagentType": "explorer",
    "taskTemplate": "Analiza el directorio {{path}}. Lista los archivos TS más grandes y devuelve un JSON con { fileCount, avgLines, largestFiles }",
    "captureOutputAs": "analysis",
    "maxSteps": 10
  }
}
```

Y en un pipeline que lo usa:

```json
{
  "type": "pipeline",
  "steps": [
    {
      "tool": "analyze_codebase",
      "params": { "path": "./apps/server/src" },
      "output": "analysisResult"
    },
    {
      "tool": "render_report",
      "params": { "data": "{{analysisResult}}" }
    }
  ]
}
```

---

## Criterio de aceptación

- [ ] `CustomToolDefinition.execute.type` acepta `"agent"`
- [ ] Una custom tool con `type: "agent"` spawna un subagente al ejecutarse
- [ ] El output del subagente se captura en el scope del pipeline si `captureOutputAs` está definido
- [ ] Las variables del scope previo se interpolan en `taskTemplate`
- [ ] `pnpm --filter server run typecheck` → 0 errores
- [ ] Test unitario: `custom-tool-agent.test.ts` — verifica el spawn y la captura de outputs

---

## Estimación

**1 día.** Reutiliza toda la infraestructura existente. La mayor parte del trabajo es la extracción de `spawnSubagent` como helper testeable.
