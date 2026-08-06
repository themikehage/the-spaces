import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import { SessionPrefix } from "shared";
import type { DelegationRegistry } from "../delegation/delegation-registry";
import type { EventBus } from "../ports/spaces-host.port";
import type { SessionManager } from "../session/session-manager";
import { spawnSubagent } from "../session/spawn-subagent";
import { interpolateString } from "./variable-interpolator";
import { workflowRunStore } from "./workflow-run-store";

export interface StepExecutorDeps {
  sessionManager: SessionManager;
  delegationRegistry: DelegationRegistry;
  eventBus?: EventBus;
}

export class StepExecutor {
  constructor(private deps: StepExecutorDeps) {}

  async execute(
    step: WorkflowStep,
    run: WorkflowRun,
    scope: Record<string, unknown>,
    workspaceDir: string,
    signal?: AbortSignal,
  ): Promise<WorkflowStepState> {
    const startedAt = new Date().toISOString();

    try {
      if (step.type !== "agent") {
        throw new Error(`Unsupported workflow step type: ${step.type}`);
      }
      return await this.executeAgentStep(step, run, scope, workspaceDir, startedAt, signal);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        stepId: step.id,
        status: "error",
        startedAt,
        completedAt: new Date().toISOString(),
        error: errorMsg,
      };
    }
  }

  private async executeAgentStep(
    step: WorkflowStep,
    run: WorkflowRun,
    scope: Record<string, unknown>,
    workspaceDir: string,
    startedAt: string,
    signal?: AbortSignal,
  ): Promise<WorkflowStepState> {
    const taskTemplate = step.taskTemplate || `Execute step ${step.label}`;
    const task = String(interpolateString(taskTemplate, scope));
    const toolCallId = `wf-${run.id.slice(0, 8)}-${step.id}`;
    const parentSessionId = run.parentSessionId || `wf-run-${run.id}`;
    const agentSessionId = `${SessionPrefix.SUBAGENT}${toolCallId}`;

    // Emit event & update step state with agentSessionId right when running starts
    workflowRunStore.updateStepState(run.username, run.id, step.id, {
      status: "running",
      startedAt,
      agentSessionId,
    });

    this.deps.eventBus?.emit("workflow_step_started", {
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
      sessionManager: this.deps.sessionManager,
      delegationRegistry: this.deps.delegationRegistry,
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

    let outputs: Record<string, unknown> = envelope.outputs || {};
    if (step.captureOutputs && step.captureOutputs.length > 0) {
      const filtered: Record<string, unknown> = {};
      for (const key of step.captureOutputs) {
        if (outputs[key] !== undefined) {
          filtered[key] = outputs[key];
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
}

