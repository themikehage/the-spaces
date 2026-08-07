// SPDX-License-Identifier: MIT
import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import type { IWorkflowEngine } from "../../ports/workflow-engine.port";
import { interpolateValue } from "../variable-interpolator";

export interface SubWorkflowExecutorDeps {
  workflowEngine?: IWorkflowEngine;
  currentDepth?: number;
}

export async function executeSubWorkflowStep(
  step: WorkflowStep,
  run: WorkflowRun,
  scope: Record<string, unknown>,
  startedAt: string,
  deps: SubWorkflowExecutorDeps,
  signal?: AbortSignal,
): Promise<WorkflowStepState> {
  const subWorkflowId = step.subWorkflowId;
  if (!subWorkflowId) {
    return {
      stepId: step.id,
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      error: "Missing subWorkflowId in step definition",
    };
  }

  if (subWorkflowId === run.workflowId) {
    return {
      stepId: step.id,
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      error: `Direct recursion detected: workflow '${run.workflowId}' cannot invoke itself as a sub-workflow`,
    };
  }

  const currentDepth = deps.currentDepth || 1;
  if (currentDepth > 3) {
    return {
      stepId: step.id,
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      error: `Sub-workflow depth limit reached (max 3). Cannot invoke '${subWorkflowId}'`,
    };
  }

  if (!deps.workflowEngine) {
    return {
      stepId: step.id,
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      error: "WorkflowEngine dependency missing in sub-workflow executor",
    };
  }

  const interpolatedInputs = (interpolateValue(
    step.subWorkflowInputs || {},
    scope,
  ) as Record<string, unknown>) || {};

  try {
    const childRun = await deps.workflowEngine.run(run.username, subWorkflowId, {
      inputs: interpolatedInputs,
      parentSessionId: run.workflowSessionId || run.parentSessionId,
    });

    // Wait for child run resolution
    let finalRunState = childRun;
    while (finalRunState.status === "pending" || finalRunState.status === "running") {
      if (signal?.aborted) {
        await deps.workflowEngine.abort(run.username, childRun.id);
        return {
          stepId: step.id,
          status: "error",
          startedAt,
          completedAt: new Date().toISOString(),
          error: "Sub-workflow execution aborted by parent signal",
        };
      }
      await new Promise((res) => setTimeout(res, 200));
      const checked = deps.workflowEngine.getRunStatus(run.username, childRun.id);
      if (checked) {
        finalRunState = checked;
      }
    }

    if (finalRunState.status === "error" || finalRunState.status === "cancelled") {
      return {
        stepId: step.id,
        status: "error",
        startedAt,
        completedAt: new Date().toISOString(),
        error: `Sub-workflow '${subWorkflowId}' finished with status '${finalRunState.status}'`,
      };
    }

    // Collect outputs from all success steps in child run
    const childOutputs: Record<string, unknown> = {};
    for (const [sId, sState] of Object.entries(finalRunState.stepStates)) {
      if (sState.outputs) {
        childOutputs[sId] = sState.outputs;
      }
    }

    return {
      stepId: step.id,
      status: "success",
      startedAt,
      completedAt: new Date().toISOString(),
      outputs: {
        runId: childRun.id,
        workflowId: subWorkflowId,
        stepOutputs: childOutputs,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      stepId: step.id,
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      error: `Sub-workflow execution error: ${errorMsg}`,
    };
  }
}
