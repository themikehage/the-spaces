import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import { SessionPrefix } from "shared";
import type { DelegationRegistry } from "../../delegation/delegation-registry";
import type { EventBus } from "../../ports/spaces-host.port";
import type { SessionManager } from "../../session/session-manager";
import { spawnSubagent } from "../../session/spawn-subagent";
import { interpolateString } from "../variable-interpolator";
import { workflowRunStore } from "../workflow-run-store";

export interface AgentExecutorDeps {
  sessionManager: SessionManager;
  delegationRegistry: DelegationRegistry;
  eventBus?: EventBus;
}

export async function executeAgentStep(
  step: WorkflowStep,
  run: WorkflowRun,
  scope: Record<string, unknown>,
  workspaceDir: string,
  startedAt: string,
  deps: AgentExecutorDeps,
  signal?: AbortSignal,
): Promise<WorkflowStepState> {
  const taskTemplate = step.taskTemplate || `Execute step ${step.label}`;
  const task = String(interpolateString(taskTemplate, scope));
  const toolCallId = `wf-${run.id.slice(0, 8)}-${step.id}`;
  const parentSessionId = run.workflowSessionId || run.parentSessionId || `wf-run-${run.id}`;
  const agentSessionId = `${SessionPrefix.SUBAGENT}${toolCallId}`;

  workflowRunStore.updateStepState(run.username, run.id, step.id, {
    status: "running",
    startedAt,
    agentSessionId,
  });

  deps.eventBus?.emit("workflow_step_started", {
    runId: run.id,
    stepId: step.id,
    stepLabel: step.label,
    agentSessionId,
  });

  const envelope = await spawnSubagent({
    toolCallId,
    username: run.username,
    parentSessionId,
    agentId: step.agentId || undefined,
    task,
    subagentType: step.subagentType || "builder",
    maxSteps: step.maxSteps,
    sessionManager: deps.sessionManager,
    delegationRegistry: deps.delegationRegistry,
    workspaceDir,
    signal,
  });

  if (envelope.status === "error" || envelope.status === "blocked") {
    return {
      stepId: step.id,
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      error: envelope.executive_summary || "Agent step failed",
      agentSessionId,
    };
  }

  let rawOutputs: Record<string, unknown> = envelope.outputs || {};
  let outputs: Record<string, unknown> = rawOutputs;

  if (step.captureOutputs && step.captureOutputs.length > 0) {
    const filtered: Record<string, unknown> = {};
    for (const key of step.captureOutputs) {
      if (rawOutputs[key] !== undefined) {
        filtered[key] = rawOutputs[key];
      } else if ((envelope as any)[key] !== undefined) {
        filtered[key] = (envelope as any)[key];
      } else if (
        (key === "summary" || key === "executive_summary") &&
        envelope.executive_summary
      ) {
        filtered[key] = envelope.executive_summary;
      } else {
        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(rawOutputs).find(
          (k) => k.toLowerCase() === lowerKey || k.toLowerCase().replace(/_/g, "") === lowerKey.replace(/_/g, ""),
        );
        if (foundKey && rawOutputs[foundKey] !== undefined) {
          filtered[key] = rawOutputs[foundKey];
        } else if (envelope.executive_summary) {
          filtered[key] = envelope.executive_summary;
        }
      }
    }
    outputs = filtered;
  }

  return {
    stepId: step.id,
    status: "success",
    startedAt,
    completedAt: new Date().toISOString(),
    outputs,
    agentSessionId,
  };
}
