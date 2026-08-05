# Hito 25.5 — Approval Checkpoint en Workflow Steps

**Estado:** 📋 Planificado  
**Dependencias:** Hito 25.3 (WorkflowEngine)  
**Desbloquea:** Workflows human-in-the-loop reales

---

## Objetivo

Permitir que cualquier step de un workflow (de tipo `"approval"`) pause la ejecución y espere confirmación humana antes de continuar. Esto convierte los workflows de sistemas totalmente autónomos a sistemas **human-in-the-loop** donde el humano mantiene el control en puntos críticos.

---

## Diagnóstico — Estado actual

### Lo que SÍ existe

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| `ApprovalPort.requestApproval()` | OK | Puerto para solicitar aprobación en `spaces-host.port.ts` |
| `UiApprovalRegistry` | OK | Registro de aprobaciones pendientes con WebSocket |
| `ask_question` tool | OK | Desacoplada de modales — renderizado inline en chat |
| Attention Hub (TopBar) | OK | Popover con badges para aprobaciones/preguntas pendientes |
| `WorkflowRun.status: "waiting_approval"` | OK | Definido en Hito 25.3 |
| `approveStep` / `rejectStep` en `IWorkflowEngine` | OK | Definido en Hito 25.3 |

### Lo que NO existe

| Gap | Impacto | Ubicación |
|-----|---------|-----------|
| Step type `"approval"` en WorkflowEngine | El engine no sabe cómo pausar y esperar | `core/workflows/step-executor.ts` (a crear en H25.3) |
| Notificación WS de aprobación pendiente | El cliente no sabe que hay un workflow esperando | `ws-messages.ts` |
| UI para aprobar/rechazar steps de workflow | El usuario no puede interactuar con el workflow pausado | `WorkflowRunPanel` |
| Timeout de aprobación | Un workflow puede quedar bloqueado indefinidamente | `step-executor.ts` |
| Historial de aprobaciones en `WorkflowRun` | No hay trazabilidad de quién aprobó qué y cuándo | `WorkflowRun` |

---

## Diseño

### 1. Tipo de step `"approval"` — schema en `packages/shared`

```typescript
// packages/shared/src/workflows.ts — WorkflowStep (ya existe en H25.3)
// Campos relevantes para tipo "approval":

{
  type: "approval",
  label: "Revisión humana antes del deploy",
  /** Mensaje detallado mostrado al humano */
  approvalMessage: string,
  /** Contexto adicional (puede incluir interpolación de variables) */
  approvalContext?: string,
  /** Tiempo máximo de espera en segundos. Si expira, el workflow falla */
  timeoutSeconds?: number,
  /** Comportamiento si el timeout expira: "fail" | "skip" | "auto-approve" */
  onTimeout?: "fail" | "skip" | "auto-approve",
}
```

### 2. `executeApprovalStep` en `StepExecutor`

```typescript
// core/workflows/step-executor.ts

private async executeApprovalStep(
  step: WorkflowStep,
  run: WorkflowRun,
  scope: Record<string, unknown>,
  signal: AbortSignal,
): Promise<WorkflowStepState> {
  // 1. Actualizar estado del step a "waiting_approval"
  this.runStore.updateStepStatus(run.username, run.id, step.id, "waiting_approval");

  // 2. Actualizar estado del run
  this.runStore.updateStatus(run.username, run.id, "waiting_approval");

  // 3. Emitir evento WS para que el cliente muestre el banner de aprobación
  this.eventBus.emit("workflow_step_approval", {
    runId: run.id,
    stepId: step.id,
    stepLabel: step.label,
    approvalMessage: resolveVariables(step.approvalMessage ?? "", scope),
    approvalContext: step.approvalContext ? resolveVariables(step.approvalContext, scope) : undefined,
    workflowName: run.workflowName,
  });

  // 4. Esperar la decisión humana mediante Promise con timeout
  const timeoutMs = (step.timeoutSeconds ?? 3600) * 1000; // default: 1 hora

  try {
    const approved = await this.waitForApproval(run.id, step.id, signal, timeoutMs);

    if (!approved) {
      // El humano rechazó
      return {
        stepId: step.id,
        status: "error",
        error: "Aprobación rechazada por el usuario",
        completedAt: new Date().toISOString(),
      };
    }

    // El humano aprobó
    return {
      stepId: step.id,
      status: "success",
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Timeout o abort
    if (step.onTimeout === "skip") {
      return { stepId: step.id, status: "skipped", completedAt: new Date().toISOString() };
    }
    if (step.onTimeout === "auto-approve") {
      return { stepId: step.id, status: "success", completedAt: new Date().toISOString() };
    }
    // "fail" (default)
    return { stepId: step.id, status: "error", error: "Timeout de aprobación", completedAt: new Date().toISOString() };
  }
}

private waitForApproval(
  runId: string,
  stepId: string,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const key = `${runId}:${stepId}`;

    const cleanup = () => {
      this.pendingApprovals.delete(key);
      clearTimeout(timer);
    };

    // Registrar el resolver para que approveStep/rejectStep puedan resolverlo
    this.pendingApprovals.set(key, { resolve, reject, cleanup });

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Approval timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    signal.addEventListener("abort", () => {
      cleanup();
      reject(new Error("Workflow aborted"));
    });
  });
}

// Llamado por WorkflowEngine.approveStep():
approveStep(runId: string, stepId: string): void {
  const key = `${runId}:${stepId}`;
  const pending = this.pendingApprovals.get(key);
  if (pending) {
    pending.cleanup();
    pending.resolve(true);
  }
}

// Llamado por WorkflowEngine.rejectStep():
rejectStep(runId: string, stepId: string): void {
  const key = `${runId}:${stepId}`;
  const pending = this.pendingApprovals.get(key);
  if (pending) {
    pending.cleanup();
    pending.resolve(false);
  }
}
```

### 3. Historial de aprobaciones en `WorkflowRun`

```typescript
// packages/shared/src/workflows.ts

export interface WorkflowApprovalRecord {
  stepId: string;
  stepLabel: string;
  decision: "approved" | "rejected";
  decidedAt: string;
}

export interface WorkflowRun {
  // ... campos existentes ...
  approvals?: WorkflowApprovalRecord[];  // ← nuevo
}
```

### 4. Eventos WebSocket adicionales

```typescript
// packages/shared/src/ws-messages.ts

| workflow_step_approved  | { runId, stepId, stepLabel }
| workflow_step_rejected  | { runId, stepId, stepLabel }
```

### 5. UI — `WorkflowApprovalBanner` en `WorkflowRunPanel`

```tsx
// apps/client/src/components/workflows/WorkflowApprovalBanner.tsx

interface Props {
  runId: string;
  stepId: string;
  stepLabel: string;
  approvalMessage: string;
  approvalContext?: string;
  onApprove: () => void;
  onReject: () => void;
}

// Banner prominente con:
// - Ícono de pausa / shield
// - Mensaje de aprobación (con markdown)
// - Contexto adicional (collapsible)
// - Botones "Aprobar" (verde) y "Rechazar" (rojo)
```

### 6. Integración con Attention Hub

El banner del Attention Hub existente debe mostrar workflows con aprobaciones pendientes:

```typescript
// Evento WS "workflow_step_approval" debe agregarse al conteo del Attention Hub
// junto con los eventos de "ask_question" y "approval_requested"
```

---

## Archivos afectados

| Archivo | Operación | Descripción |
|---------|-----------|-------------|
| `packages/shared/src/workflows.ts` | MODIFY | Agregar `WorkflowApprovalRecord`, campo `approvals` en `WorkflowRun` |
| `packages/shared/src/ws-messages.ts` | MODIFY | Agregar `workflow_step_approved`, `workflow_step_rejected` |
| `core/workflows/step-executor.ts` | MODIFY | Implementar `executeApprovalStep`, `waitForApproval`, `approveStep`, `rejectStep` |
| `core/workflows/workflow-engine.ts` | MODIFY | Delegar `approveStep`/`rejectStep` al `StepExecutor` |
| `apps/server/src/routes/workflows/workflow-runs.ts` | MODIFY | Endpoints `POST /runs/:runId/steps/:stepId/approve` y `/reject` |
| `apps/client/src/components/workflows/WorkflowApprovalBanner.tsx` | NEW | Banner de aprobación en `WorkflowRunPanel` |
| `apps/client/src/components/layout/AttentionHub.tsx` | MODIFY | Integrar eventos de workflow approval |

---

## Ejemplo de workflow con approval checkpoint

```json
{
  "id": "deploy-to-prod",
  "name": "Deploy to Production",
  "steps": [
    {
      "id": "build",
      "type": "agent",
      "label": "Build & Test",
      "agentId": "ci-agent",
      "taskTemplate": "Run build and tests for the project. Return outputs.testsPassed and outputs.buildArtifact"
    },
    {
      "id": "human-review",
      "type": "approval",
      "label": "Human Review",
      "dependsOn": ["build"],
      "approvalMessage": "Build completado. ¿Autorizar el deploy a producción?",
      "approvalContext": "Tests pasados: {{build.testsPassed}}. Artefacto: {{build.buildArtifact}}",
      "timeoutSeconds": 3600,
      "onTimeout": "fail"
    },
    {
      "id": "deploy",
      "type": "agent",
      "label": "Deploy",
      "dependsOn": ["human-review"],
      "agentId": "deploy-agent",
      "taskTemplate": "Deploy the artifact {{build.buildArtifact}} to production"
    }
  ],
  "onError": "stop"
}
```

---

## Criterio de aceptación

- [ ] Un workflow con step `"approval"` pausa en ese step y emite `workflow_step_approval` via WS
- [ ] El Attention Hub muestra el workflow en estado de espera
- [ ] El usuario puede aprobar o rechazar desde la UI del `WorkflowRunPanel`
- [ ] Al aprobar, el workflow continúa con el siguiente step
- [ ] Al rechazar, el workflow termina con `status: "error"` y el step registra el rechazo
- [ ] El timeout configurable funciona correctamente
- [ ] `pnpm --filter server run typecheck` → 0 errores

---

## Estimación

**1 día.** El mecanismo de `Promise` con `Map` de resolvers es un patrón establecido en el codebase (similar al `UiApprovalRegistry`).
