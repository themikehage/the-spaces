import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import type { DelegationRegistry } from "../../delegation/delegation-registry";
import type { EventBus } from "../../ports/spaces-host.port";
import { getLastAssistantText, parseEnvelope } from "../../session/agent-utils";
import type { SessionManager } from "../../session/session-manager";
import { sessionMetadataStore } from "../../session/metadata-store";
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
  const agentSessionId = `wf-${run.id}-${step.id}`;
  const agentId = step.agentId || `wf-${run.workflowId}`;

  sessionMetadataStore.saveSessionMetadata(run.username, agentSessionId, {
    isWorkflowSession: true,
    workflowRunId: run.id,
    workflowId: run.workflowId,
    agentId,
    executionMode: "standard",
    workspaceDir,
    startedAt,
  });

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

  let envelope: ReturnType<typeof parseEnvelope>;
  try {
    const session = await deps.sessionManager.getOrCreateSession(
      run.username,
      agentSessionId,
      undefined,
      agentId,
      { workspaceDir },
    );

    if (signal?.aborted) {
      return {
        stepId: step.id,
        status: "error",
        startedAt,
        completedAt: new Date().toISOString(),
        error: "Execution was aborted",
        agentSessionId,
      };
    }

    await session.prompt(task);

    const lastText = getLastAssistantText(session.messages);
    envelope = parseEnvelope(lastText, step.agentOutputMaxChars);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      stepId: step.id,
      status: "error",
      startedAt,
      completedAt: new Date().toISOString(),
      error: `Agent step failed: ${msg}`,
      agentSessionId,
    };
  }

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
