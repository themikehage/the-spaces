# Hito 25.3 — WorkflowDefinition + WorkflowEngine

**Estado:** 📋 Planificado  
**Dependencias:** Hito 25.1 (outputs tipados), Hito 25.2 (agent tool type)  
**Desbloquea:** Hito 25.4, 25.5, 25.6, 25.7

---

## Objetivo

Implementar el concepto de **Workflow** como entidad de primera clase en Spaces: una secuencia o grafo de pasos (agentes, tools, aprobaciones) con dependencias entre ellos, inputs/outputs tipados, y un motor de ejecución desacoplado (`WorkflowEngine`) que respeta el mismo patrón de puertos del resto del sistema.

---

## Diagnóstico — Estado actual

### Lo que SÍ existe (base reutilizable)

| Aspecto                   | Detalle                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `DelegationRegistry`      | Registro de delegaciones activas con BFS abort en cascada               |
| `SpacesHost.delegations`  | Puerto de delegaciones inyectable                                       |
| `IAgentRuntime`           | Contrato de runtime de agente — el engine delega a estos                |
| `ExecutionPipelineSchema` | Pipeline de steps — inspiración del modelo de WorkflowStep              |
| `CascadeConfigLoader`     | Herencia de config por entidad — mismo patrón para workflows            |
| `ScheduleService`         | Ejecución periódica desacoplada — referencia de arquitectura in-process |

### Lo que NO existe (a construir)

| Entidad                  | Descripción                                       |
| ------------------------ | ------------------------------------------------- |
| `WorkflowDefinition`     | Contrato de un workflow en `packages/shared`      |
| `WorkflowStep`           | Paso individual: agente, tool, approval, parallel |
| `WorkflowRun`            | Instancia de ejecución de un workflow             |
| `WorkflowEngine`         | Motor de ejecución del DAG                        |
| `IWorkflowEngine`        | Puerto en `core/ports/`                           |
| REST `/api/workflows`    | CRUD + trigger                                    |
| UI `WorkflowBuilderPage` | Editor visual del grafo                           |

---

## Diseño — Contratos en `packages/shared`

### `WorkflowDefinition`

```typescript
// packages/shared/src/workflows.ts

export type WorkflowStepType = "agent" | "tool" | "approval" | "parallel" | "condition";

export interface WorkflowStep {
  /** Identificador único dentro del workflow */
  id: string;
  /** Tipo de paso */
  type: WorkflowStepType;
  /** Etiqueta visible en UI */
  label: string;
  /** IDs de pasos que deben completarse antes de ejecutar este */
  dependsOn?: string[];

  // --- type: "agent" ---
  /** ID del agente a invocar (si omitido, spawna subagente anónimo) */
  agentId?: string;
  /**
   * Plantilla de la tarea enviada al agente.
   * Soporta interpolación: {{step_id.outputName}} o {{inputs.varName}}
   */
  taskTemplate?: string;
  /** Tipo de autonomía del subagente */
  subagentType?: "explorer" | "builder" | "autonomous";
  /** Máximo de steps del subagente */
  maxSteps?: number;
  /** Variables a capturar del output del subagente */
  captureOutputs?: string[];

  // --- type: "tool" ---
  /** Nombre de la tool a invocar */
  toolName?: string;
  /** Parámetros de la tool (con soporte de interpolación) */
  toolParams?: Record<string, unknown>;

  // --- type: "approval" ---
  /** Mensaje mostrado al humano para solicitar aprobación */
  approvalMessage?: string;

  // --- type: "parallel" ---
  /** IDs de pasos que se ejecutan en paralelo dentro de este paso */
  parallelStepIds?: string[];

  // --- type: "condition" ---
  /** Expresión de condición — resultado es boolean */
  conditionExpression?: string;
  /** Paso a ejecutar si la condición es verdadera */
  ifTrueStepId?: string;
  /** Paso a ejecutar si la condición es falsa */
  ifFalseStepId?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  /** Scope de entidad al que pertenece el workflow */
  scope?: {
    type: "global" | "team" | "project" | "agent";
    entityId?: string;
  };
  /** Variables de entrada al workflow */
  inputs?: Record<
    string,
    {
      type: "string" | "number" | "boolean" | "object";
      description?: string;
      required?: boolean;
      default?: unknown;
    }
  >;
  /** Steps del workflow (el orden de ejecución se deduce de dependsOn) */
  steps: WorkflowStep[];
  /** Comportamiento ante error en un step */
  onError: "stop" | "continue" | "retry";
  /** Número de reintentos si onError es "retry" */
  retryCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  /** Inputs con los que se invocó el workflow */
  inputs: Record<string, unknown>;
  status: "pending" | "running" | "success" | "error" | "cancelled" | "waiting_approval";
  /** Estado individual de cada step */
  stepStates: Record<string, WorkflowStepState>;
  startedAt: string;
  completedAt?: string;
  username: string;
  /** Sesión padre desde la que se lanzó el workflow */
  parentSessionId?: string;
}

export interface WorkflowStepState {
  stepId: string;
  status: "pending" | "running" | "success" | "error" | "skipped" | "waiting_approval";
  startedAt?: string;
  completedAt?: string;
  /** Outputs producidos por este step */
  outputs?: Record<string, unknown>;
  /** Sesión del subagente creado para este step */
  agentSessionId?: string;
  /** Mensaje de error si status === "error" */
  error?: string;
}
```

---

## Diseño — Puerto `IWorkflowEngine`

```typescript
// core/ports/workflow-engine.port.ts

import type { WorkflowDefinition, WorkflowRun } from "shared";

export interface WorkflowRunOptions {
  inputs?: Record<string, unknown>;
  parentSessionId?: string;
}

export interface IWorkflowEngine {
  /** Crea o actualiza un workflow en el store */
  save(username: string, def: WorkflowDefinition): Promise<WorkflowDefinition>;

  /** Elimina un workflow */
  delete(username: string, workflowId: string): Promise<void>;

  /** Lista todos los workflows del usuario */
  list(username: string, filter?: { scopeType?: string; entityId?: string }): WorkflowDefinition[];

  /** Obtiene un workflow por ID */
  get(username: string, workflowId: string): WorkflowDefinition | null;

  /** Ejecuta un workflow y retorna el WorkflowRun */
  run(username: string, workflowId: string, opts?: WorkflowRunOptions): Promise<WorkflowRun>;

  /** Obtiene el estado actual de una ejecución */
  getRunStatus(username: string, runId: string): WorkflowRun | null;

  /** Cancela una ejecución en curso */
  abort(username: string, runId: string): Promise<void>;

  /** Lista todas las ejecuciones de un workflow */
  listRuns(username: string, workflowId: string): WorkflowRun[];

  /** Aprueba un step en estado waiting_approval */
  approveStep(username: string, runId: string, stepId: string): Promise<void>;

  /** Rechaza un step en estado waiting_approval */
  rejectStep(username: string, runId: string, stepId: string): Promise<void>;
}
```

---

## Diseño — `WorkflowEngine` (implementación)

```
core/workflows/
├── workflow-engine.ts         ← Implementa IWorkflowEngine
├── workflow-store.ts          ← Persistencia en filesystem (JSON por workflow)
├── workflow-run-store.ts      ← Persistencia de WorkflowRun en JSON
├── dag-resolver.ts            ← Resuelve orden topológico y paralelos
├── step-executor.ts           ← Ejecuta un WorkflowStep individual
├── variable-interpolator.ts   ← Interpolación {{step.output}} en templates
└── workflow-event-bus.ts      ← Eventos WS de workflow (usa EventBus existente)
```

### `dag-resolver.ts` — Orden topológico

```typescript
export function resolveExecutionOrder(steps: WorkflowStep[]): WorkflowStep[][] {
  // Retorna batches de steps que pueden ejecutarse en paralelo
  // Cada batch espera a que todos los steps del batch anterior terminen
  // Algoritmo: Kahn's algorithm para topological sort
  // Steps sin dependsOn van al batch 0
  // Steps con dependsOn van al batch max(dependsOn depths) + 1
}
```

### `step-executor.ts` — Ejecutor de step individual

```typescript
export class StepExecutor {
  constructor(
    private sessionManager: ISessionManager,
    private delegationRegistry: DelegationRegistry,
    private approvalPort: ApprovalPort,
    private eventBus: EventBus,
  ) {}

  async execute(
    step: WorkflowStep,
    run: WorkflowRun,
    scope: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<WorkflowStepState> {
    switch (step.type) {
      case "agent":
        return this.executeAgentStep(step, run, scope, signal);
      case "tool":
        return this.executeToolStep(step, run, scope, signal);
      case "approval":
        return this.executeApprovalStep(step, run, scope, signal);
      case "parallel":
        return this.executeParallelStep(step, run, scope, signal);
      case "condition":
        return this.executeConditionStep(step, run, scope, signal);
    }
  }

  private async executeAgentStep(step, run, scope, signal): Promise<WorkflowStepState> {
    // Interpola taskTemplate con scope actual
    // Llama spawnSubagent (helper de agent-utils.ts — Hito 25.2)
    // Actualiza scope con captureOutputs
    // Emite evento WS: workflow_step_update
  }
}
```

### `workflow-engine.ts` — Orquestador del DAG

```typescript
export class WorkflowEngine implements IWorkflowEngine {
  private activeRuns = new Map<string, AbortController>();

  async run(username: string, workflowId: string, opts?: WorkflowRunOptions): Promise<WorkflowRun> {
    const def = this.store.get(username, workflowId);
    if (!def) throw new Error(`Workflow ${workflowId} not found`);

    const run = this.runStore.create(username, workflowId, opts?.inputs ?? {});
    const abortController = new AbortController();
    this.activeRuns.set(run.id, abortController);

    // Ejecutar de forma asíncrona (no bloquear el caller)
    this.executeDAG(username, def, run, opts, abortController.signal).catch((err) => {
      this.runStore.updateStatus(username, run.id, "error");
      this.eventBus.emit("workflow_run_error", { runId: run.id, error: String(err) });
    });

    return run;
  }

  private async executeDAG(
    username: string,
    def: WorkflowDefinition,
    run: WorkflowRun,
    opts: WorkflowRunOptions | undefined,
    signal: AbortSignal,
  ): Promise<void> {
    const batches = dagResolver.resolveExecutionOrder(def.steps);
    const scope: Record<string, unknown> = { ...opts?.inputs };

    for (const batch of batches) {
      if (signal.aborted) break;

      const batchResults = await Promise.allSettled(
        batch.map((step) => this.stepExecutor.execute(step, run, scope, signal)),
      );

      for (const result of batchResults) {
        if (result.status === "rejected" && def.onError === "stop") {
          this.runStore.updateStatus(username, run.id, "error");
          this.eventBus.emit("workflow_run_completed", { runId: run.id, status: "error" });
          return;
        }
        if (result.status === "fulfilled" && result.value.outputs) {
          Object.assign(scope, result.value.outputs);
        }
      }
    }

    this.runStore.updateStatus(username, run.id, "success");
    this.eventBus.emit("workflow_run_completed", { runId: run.id, status: "success" });
  }
}
```

---

## Diseño — Tool `run_workflow` para el agente global

El agente global necesita poder invocar workflows como una herramienta más:

```typescript
// core/tools/extensions/workflow.tool.ts

export function createWorkflowTools(opts: {
  username: string;
  sessionId: string;
  workflowEngine: IWorkflowEngine;
}) {
  return [
    {
      name: "list_workflows",
      description: "Lista todos los workflows disponibles con sus descripciones y steps.",
      parameters: { type: "object", properties: {} },
      execute: async () => {
        const workflows = opts.workflowEngine.list(opts.username);
        return { content: [{ type: "text", text: JSON.stringify(workflows, null, 2) }] };
      },
    },
    {
      name: "run_workflow",
      description: "Ejecuta un workflow por su ID con inputs opcionales.",
      parameters: {
        type: "object",
        properties: {
          workflowId: { type: "string" },
          inputs: { type: "object" },
        },
        required: ["workflowId"],
      },
      execute: async (
        _id: string,
        args: { workflowId: string; inputs?: Record<string, unknown> },
      ) => {
        const run = await opts.workflowEngine.run(opts.username, args.workflowId, {
          inputs: args.inputs,
          parentSessionId: opts.sessionId,
        });
        return {
          content: [{ type: "text", text: `Workflow iniciado. Run ID: ${run.id}` }],
          details: { run },
        };
      },
    },
    {
      name: "get_workflow_status",
      description: "Obtiene el estado actual de una ejecución de workflow.",
      parameters: {
        type: "object",
        properties: { runId: { type: "string" } },
        required: ["runId"],
      },
      execute: async (_id: string, args: { runId: string }) => {
        const status = opts.workflowEngine.getRunStatus(opts.username, args.runId);
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
      },
    },
  ];
}
```

---

## Diseño — REST API `/api/workflows`

```
GET    /api/workflows                    → lista workflows del usuario
POST   /api/workflows                    → crea workflow
GET    /api/workflows/:id               → obtiene workflow
PUT    /api/workflows/:id               → actualiza workflow
DELETE /api/workflows/:id               → elimina workflow
POST   /api/workflows/:id/run           → ejecuta workflow (body: { inputs? })
GET    /api/workflows/runs/:runId       → estado de una ejecución
POST   /api/workflows/runs/:runId/abort → cancela ejecución
POST   /api/workflows/runs/:runId/steps/:stepId/approve → aprueba step
POST   /api/workflows/runs/:runId/steps/:stepId/reject  → rechaza step
```

---

## Diseño — Eventos WebSocket

```typescript
// packages/shared/src/ws-messages.ts — agregar:

| workflow_run_started    | { runId, workflowId, workflowName }
| workflow_step_started   | { runId, stepId, stepLabel }
| workflow_step_completed | { runId, stepId, status, outputs? }
| workflow_step_approval  | { runId, stepId, approvalMessage }
| workflow_run_completed  | { runId, status: "success" | "error" | "cancelled" }
```

---

## Diseño — Extensión de `SpacesHost`

```typescript
// core/ports/spaces-host.port.ts

import type { IWorkflowEngine } from "./workflow-engine.port";

export interface SpacesHost {
  // ... existente ...
  workflows?: IWorkflowEngine; // ← nuevo
}
```

---

## Diseño — UI `WorkflowBuilderPage`

```
apps/client/src/pages/WorkflowBuilderPage.tsx
├── WorkflowCanvas.tsx          ← Grid/canvas con los steps como cards
├── WorkflowStepCard.tsx        ← Card de cada step con sus conexiones
├── WorkflowStepEditor.tsx      ← Panel lateral para editar un step
├── WorkflowRunPanel.tsx        ← Estado en tiempo real de una ejecución
└── WorkflowRunHistoryPanel.tsx ← Historial de ejecuciones
```

**Navegación:** nueva ruta en el sidebar → `Workflows` (ícono: `GitBranch` o `Workflow`)

---

## Estructura de archivos nueva

```
apps/server/src/core/workflows/
├── workflow-engine.ts
├── workflow-store.ts
├── workflow-run-store.ts
├── dag-resolver.ts
├── step-executor.ts
├── variable-interpolator.ts
└── index.ts

apps/server/src/routes/workflows/
├── index.ts           ← Assembler de sub-routers
├── workflow-crud.ts   ← GET/POST/PUT/DELETE /api/workflows
└── workflow-runs.ts   ← POST /run, GET /runs/:id, abort, approve

packages/shared/src/
├── workflows.ts       ← WorkflowDefinition, WorkflowRun, WorkflowStep, etc.

apps/client/src/pages/
└── WorkflowBuilderPage.tsx (+ componentes)
```

---

## Archivos modificados

| Archivo                                         | Operación        | Descripción                                                                    |
| ----------------------------------------------- | ---------------- | ------------------------------------------------------------------------------ |
| `packages/shared/src/workflows.ts`              | NEW              | Tipos `WorkflowDefinition`, `WorkflowStep`, `WorkflowRun`, `WorkflowStepState` |
| `packages/shared/src/ws-messages.ts`            | MODIFY           | Agregar eventos WS de workflow                                                 |
| `packages/shared/src/index.ts`                  | MODIFY           | Re-exportar `workflows.ts`                                                     |
| `core/ports/workflow-engine.port.ts`            | NEW              | Interfaz `IWorkflowEngine`                                                     |
| `core/ports/spaces-host.port.ts`                | MODIFY           | Agregar `workflows?: IWorkflowEngine`                                          |
| `core/workflows/`                               | NEW (6 archivos) | Implementación del WorkflowEngine                                              |
| `core/tools/extensions/workflow.tool.ts`        | NEW              | Tools `list_workflows`, `run_workflow`, `get_workflow_status`                  |
| `core/session/tool-factory.ts`                  | MODIFY           | Registrar workflow tools si `workflowEngine` disponible                        |
| `apps/server/src/routes/workflows/`             | NEW (3 archivos) | Router REST de workflows                                                       |
| `apps/server/src/index.ts`                      | MODIFY           | Montar `/api/workflows`                                                        |
| `apps/client/src/pages/WorkflowBuilderPage.tsx` | NEW              | UI del builder                                                                 |
| `apps/client/src/App.tsx`                       | MODIFY           | Ruta `/workflows`                                                              |
| `apps/client/src/components/layout/Sidebar.tsx` | MODIFY           | Ítem `Workflows` en nav                                                        |

---

## Criterio de aceptación

- [ ] `WorkflowDefinition` con 3 steps (A→B→C) se persiste y se recupera via REST
- [ ] `POST /api/workflows/:id/run` lanza el DAG y retorna `WorkflowRun` con `status: "running"`
- [ ] Los steps se ejecutan en orden topológico respetando `dependsOn`
- [ ] Los outputs de un step se interpolan en el `taskTemplate` del siguiente step
- [ ] Eventos WS `workflow_step_started`, `workflow_step_completed`, `workflow_run_completed` llegan al cliente
- [ ] `run_workflow` tool funciona desde el agente global
- [ ] `WorkflowBuilderPage` muestra los steps como cards con conexiones
- [ ] `WorkflowRunPanel` muestra el estado en tiempo real
- [ ] `pnpm --filter server run typecheck` → 0 errores
- [ ] `pnpm build` → 0 errores
- [ ] Test unitario `dag-resolver.test.ts` — topological sort con casos edge (ciclos, paralelos)
- [ ] Test unitario `variable-interpolator.test.ts`

---

## Estimación

**3-4 días.** El DAG resolver y el step executor son las partes más complejas. La UI es iterativa y puede entregarse en una versión básica (lista de steps sin canvas visual) en el primer corte.
