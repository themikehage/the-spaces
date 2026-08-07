// SPDX-License-Identifier: MIT
import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";

export async function executeWebhookStep(
  step: WorkflowStep,
  run: WorkflowRun,
  scope: Record<string, unknown>,
  startedAt: string,
): Promise<WorkflowStepState> {
  const inputs = (scope.$inputs as Record<string, unknown>) || {};
  const outputs = {
    body: inputs.body ?? null,
    headers: inputs.headers ?? {},
    query: inputs.query ?? {},
    method: inputs.method ?? "POST",
    webhookId: step.webhookId || step.id,
  };

  return {
    stepId: step.id,
    status: "success",
    startedAt,
    completedAt: new Date().toISOString(),
    outputs,
  };
}
