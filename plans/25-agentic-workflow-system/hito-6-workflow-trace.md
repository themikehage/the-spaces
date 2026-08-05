# Hito 25.6 — WorkflowTrace + Observabilidad End-to-End

**Estado:** 📋 Planificado  
**Dependencias:** Hito 25.3 (WorkflowEngine)  
**Desbloquea:** Debugging de workflows complejos

---

## Objetivo

Implementar un sistema de trazabilidad completo que permita ver el árbol de ejecución de un workflow: sesión padre, todos los subagentes creados, sus tool calls, tiempos y resultados. Sin esto, el usuario no puede debuggear ni confiar en workflows de más de 2 pasos.

---

## Diagnóstico — Estado actual

### Lo que SÍ existe

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| `ObservabilityService` | OK | Registra tool calls individuales en JSONL (`tool-calls.jsonl`) |
| `DelegationRegistry.getAll()` | OK | Lista delegaciones de una sesión padre |
| `DelegationsPanel` | OK | Muestra delegaciones con estado y `executive_summary` |
| `/api/logs/tool-calls` | OK | Endpoint de auditoría de tool calls |
| `AgentRuntimeEvent` (WS) | OK | Eventos de herramientas enviados al cliente en tiempo real |

### Lo que NO existe

| Gap | Impacto | Ubicación |
|-----|---------|-----------|
| `WorkflowTrace` — árbol unificado | No hay vista global padre+subagentes+tool calls | (no existe) |
| `/api/sessions/:id/workflow-trace` | No hay endpoint para obtener el árbol completo | `routes/sessions/` |
| `WorkflowRunPanel` con árbol visual | `DelegationsPanel` muestra solo 1 nivel de profundidad | `apps/client` |
| Correlación de tool calls con workflow steps | No hay link entre una tool call y el step del workflow que la originó | `ObservabilityService` |
| Métricas agregadas por workflow run | Tokens totales, tiempo total, tasa de éxito por step | (no existe) |

---

## Diseño

### 1. `WorkflowTrace` en `packages/shared`

```typescript
// packages/shared/src/workflows.ts

export interface WorkflowTraceNode {
  /** Sesión asociada a este nodo del árbol */
  sessionId: string;
  /** Tipo de nodo */
  type: "root" | "subagent" | "delegation";
  /** Label del step del workflow (si aplica) */
  stepId?: string;
  stepLabel?: string;
  /** Agente que ejecutó este nodo */
  agentId?: string;
  agentName?: string;
  /** Estado del nodo */
  status: "running" | "success" | "error" | "cancelled";
  startedAt?: string;
  completedAt?: string;
  /** Resumen de lo que hizo este nodo */
  executiveSummary?: string;
  /** Outputs producidos (del EnvelopeResult) */
  outputs?: Record<string, unknown>;
  /** Métricas de ejecución */
  metrics?: {
    totalSteps: number;
    toolCallCount: number;
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
  };
  /** Hijos de este nodo (subagentes que este nodo creó) */
  children: WorkflowTraceNode[];
}

export interface WorkflowTrace {
  runId: string;
  workflowId: string;
  workflowName: string;
  rootSessionId: string;
  status: WorkflowRun["status"];
  startedAt: string;
  completedAt?: string;
  /** Árbol de ejecución */
  tree: WorkflowTraceNode;
  /** Métricas agregadas del run completo */
  totals: {
    sessionCount: number;
    toolCallCount: number;
    inputTokens: number;
    outputTokens: number;
    durationMs?: number;
  };
}
```

### 2. `WorkflowTraceBuilder` — construye el árbol

```typescript
// core/workflows/workflow-trace-builder.ts

export class WorkflowTraceBuilder {
  constructor(
    private delegationRegistry: DelegationRegistry,
    private sessionManager: ISessionManager,
    private runStore: WorkflowRunStore,
    private observabilityService: ObservabilityService,
  ) {}

  async buildTrace(username: string, runId: string): Promise<WorkflowTrace | null> {
    const run = this.runStore.get(username, runId);
    if (!run) return null;

    // Construir árbol recursivamente desde la sesión raíz
    const rootNode = await this.buildNode(username, run.parentSessionId ?? runId, null, null);

    const totals = this.calculateTotals(rootNode);

    return {
      runId: run.id,
      workflowId: run.workflowId,
      workflowName: run.workflowName,
      rootSessionId: run.parentSessionId ?? runId,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      tree: rootNode,
      totals,
    };
  }

  private async buildNode(
    username: string,
    sessionId: string,
    stepId: string | null,
    stepLabel: string | null,
  ): Promise<WorkflowTraceNode> {
    const delegations = this.delegationRegistry.getAll(username, sessionId);
    const toolCallMetrics = await this.observabilityService.getMetricsForSession(sessionId);

    const children: WorkflowTraceNode[] = await Promise.all(
      delegations.map((d) =>
        this.buildNode(
          username,
          d.subagentSessionId,
          d.toolCallId,
          d.task.slice(0, 80),
        )
      )
    );

    return {
      sessionId,
      type: stepId ? "subagent" : "root",
      stepId: stepId ?? undefined,
      stepLabel: stepLabel ?? undefined,
      status: this.inferStatus(delegations),
      children,
      metrics: {
        totalSteps: toolCallMetrics?.totalCalls ?? 0,
        toolCallCount: toolCallMetrics?.totalCalls ?? 0,
        inputTokens: toolCallMetrics?.totalInputTokens ?? 0,
        outputTokens: toolCallMetrics?.totalOutputTokens ?? 0,
      },
    };
  }

  private calculateTotals(root: WorkflowTraceNode): WorkflowTrace["totals"] {
    // Suma recursiva de métricas de todos los nodos
    const allNodes = this.flattenTree(root);
    return {
      sessionCount: allNodes.length,
      toolCallCount: allNodes.reduce((sum, n) => sum + (n.metrics?.toolCallCount ?? 0), 0),
      inputTokens: allNodes.reduce((sum, n) => sum + (n.metrics?.inputTokens ?? 0), 0),
      outputTokens: allNodes.reduce((sum, n) => sum + (n.metrics?.outputTokens ?? 0), 0),
    };
  }
}
```

### 3. Endpoint REST

```typescript
// routes/sessions/session-analytics.ts (ya existe, extender)

GET /api/sessions/:id/workflow-trace
// Retorna WorkflowTrace para el workflow run asociado a esta sesión padre
// Si no hay run asociado, retorna solo el árbol de delegaciones sin metadata de workflow

GET /api/workflows/runs/:runId/trace
// Retorna WorkflowTrace directamente por run ID
```

### 4. UI — `WorkflowTreeView` en `WorkflowRunPanel`

```
WorkflowRunPanel
├── Header: nombre del workflow, estado, tiempo total, tokens totales
├── WorkflowTreeView              ← árbol de ejecución
│   ├── RootNode (sesión padre)
│   │   ├── StepNode (step A)
│   │   │   └── SubagentNode (agente B)
│   │   │       ├── tool_call: read_file
│   │   │       ├── tool_call: bash
│   │   │       └── ✅ completed: "Analicé X archivos..."
│   │   └── StepNode (step B)
│   │       └── ⏳ running...
└── WorkflowMetricsBar            ← sesiones, tool calls, tokens totales
```

**Interactividad:**
- Click en un nodo → abre la sesión asociada en el chat (navegación directa)
- Expand/collapse de subárboles
- Filtro por estado (solo errores, solo running)
- Color coding: 🟢 success / 🔴 error / 🟡 running / ⚪ pending

### 5. Correlación de tool calls con workflow steps

```typescript
// ObservabilityService — agregar campo workflowRunId al registrar tool calls

export interface ToolCallRecord {
  // ... existente ...
  workflowRunId?: string;   // ← nuevo
  workflowStepId?: string;  // ← nuevo
}
```

El `StepExecutor` pasa estos campos al contexto cuando ejecuta steps:

```typescript
// step-executor.ts
// Al hacer spawn del subagente para un step, inyectar metadata:
subagentMetadata = {
  ...subagentMetadata,
  workflowRunId: run.id,
  workflowStepId: step.id,
};
```

---

## Archivos afectados

| Archivo | Operación | Descripción |
|---------|-----------|-------------|
| `packages/shared/src/workflows.ts` | MODIFY | Agregar `WorkflowTrace`, `WorkflowTraceNode` |
| `core/workflows/workflow-trace-builder.ts` | NEW | Construye el árbol de traza recursivamente |
| `core/observability/observability-service.ts` | MODIFY | Agregar `getMetricsForSession()`, campos `workflowRunId` y `workflowStepId` |
| `apps/server/src/routes/sessions/session-analytics.ts` | MODIFY | Agregar `GET /api/sessions/:id/workflow-trace` |
| `apps/server/src/routes/workflows/workflow-runs.ts` | MODIFY | Agregar `GET /api/workflows/runs/:runId/trace` |
| `apps/client/src/components/workflows/WorkflowTreeView.tsx` | NEW | Árbol visual de ejecución |
| `apps/client/src/components/workflows/WorkflowRunPanel.tsx` | MODIFY | Integrar `WorkflowTreeView` y métricas |

---

## Criterio de aceptación

- [ ] `GET /api/workflows/runs/:runId/trace` retorna el árbol completo (padre + todos los subagentes)
- [ ] `WorkflowTreeView` muestra el árbol con estados correctos en tiempo real
- [ ] Los totales de tokens y tool calls son correctos (suma de todos los subagentes)
- [ ] Click en un nodo navega a la sesión correspondiente
- [ ] Workflows con 3+ niveles de profundidad se muestran correctamente
- [ ] `pnpm --filter server run typecheck` → 0 errores

---

## Estimación

**1.5 días.** La parte más compleja es el `WorkflowTraceBuilder` con la recursión sobre delegaciones. La UI es iterativa.
