// SPDX-License-Identifier: MIT
import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import { resolveExpression } from "../expression-engine";
import { interpolateString } from "../variable-interpolator";
import { workflowVariableStore } from "../workflow-variable-store";

export async function executeVariableStep(
  step: WorkflowStep,
  run: WorkflowRun,
  scope: Record<string, unknown>,
  startedAt: string,
): Promise<WorkflowStepState> {
  const ops = step.variableOps || [];
  const outputs: Record<string, unknown> = {};

  for (const opConfig of ops) {
    const rawKey = String(interpolateString(opConfig.key, scope));
    const interpolatedKey = rawKey;
    let resolvedVal = opConfig.value;

    if (typeof opConfig.value === "string" && opConfig.value.includes("{{")) {
      resolvedVal = resolveExpression(opConfig.value, scope as any);
    }

    switch (opConfig.op) {
      case "get": {
        const val = workflowVariableStore.get(run.username, run.workflowId, interpolatedKey);
        outputs[interpolatedKey] = val;
        break;
      }
      case "set": {
        workflowVariableStore.set(run.username, run.workflowId, interpolatedKey, resolvedVal);
        outputs[interpolatedKey] = resolvedVal;
        break;
      }
      case "delete": {
        workflowVariableStore.delete(run.username, run.workflowId, interpolatedKey);
        outputs[interpolatedKey] = null;
        break;
      }
      case "increment": {
        const amount = typeof opConfig.amount === "number" ? opConfig.amount : 1;
        const updated = workflowVariableStore.increment(
          run.username,
          run.workflowId,
          interpolatedKey,
          amount,
        );
        outputs[interpolatedKey] = updated[interpolatedKey];
        break;
      }
    }
  }

  // Also include full current state under $vars for convenience
  outputs.$vars = workflowVariableStore.getAll(run.username, run.workflowId);

  return {
    stepId: step.id,
    status: "success",
    startedAt,
    completedAt: new Date().toISOString(),
    outputs,
  };
}
