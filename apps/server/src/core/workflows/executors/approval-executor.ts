import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import type { EventBus } from "../../ports/spaces-host.port";
import { workflowApprovalStore } from "../workflow-approval-store";
import { workflowRunStore } from "../workflow-run-store";

export async function executeApprovalStep(
  step: WorkflowStep,
  run: WorkflowRun,
  startedAt: string,
  eventBus?: EventBus,
  signal?: AbortSignal,
): Promise<WorkflowStepState> {
  const message = step.approvalMessage || `Approval required for step '${step.label}'`;
  workflowRunStore.updateStepState(run.username, run.id, step.id, {
    status: "waiting_approval",
    startedAt,
  });

  eventBus?.emit("workflow_approval_requested", {
    runId: run.id,
    stepId: step.id,
    message,
  });

  if (signal?.aborted) {
    return {
      stepId: step.id,
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      error: "Approval cancelled",
    };
  }

  const approved = await workflowApprovalStore.requestApproval(run.id, step.id, message);
  if (!approved) {
    return {
      stepId: step.id,
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      error: "Step rejected by user",
    };
  }

  return {
    stepId: step.id,
    status: "success",
    startedAt,
    completedAt: new Date().toISOString(),
    outputs: { approved: true },
  };
}
