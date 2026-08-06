// SPDX-License-Identifier: MIT
import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import { SessionPrefix } from "shared";
import type { DelegationRegistry } from "../delegation/delegation-registry";
import type { EventBus } from "../ports/spaces-host.port";
import type { SessionManager } from "../session/session-manager";
import { spawnSubagent } from "../session/spawn-subagent";
import { conditionEvaluator } from "./condition-evaluator";
import { codeSandbox } from "./isolated-vm-sandbox";
import { interpolateString } from "./variable-interpolator";
import { workflowApprovalStore } from "./workflow-approval-store";
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
    dryRun?: boolean,
  ): Promise<WorkflowStepState> {
    const startedAt = new Date().toISOString();

    if (step.pinnedOutputs && (dryRun || Object.keys(step.pinnedOutputs).length > 0)) {
      workflowRunStore.updateStepState(run.username, run.id, step.id, {
        status: "pinned",
        startedAt,
        completedAt: startedAt,
        outputs: step.pinnedOutputs,
      });
      this.deps.eventBus?.emit("workflow_step_completed", {
        runId: run.id,
        stepId: step.id,
        status: "pinned",
        outputs: step.pinnedOutputs,
      });
      return {
        stepId: step.id,
        status: "pinned",
        startedAt,
        completedAt: startedAt,
        outputs: step.pinnedOutputs,
      };
    }

    try {
      switch (step.type) {
        case "agent":
          return await this.executeAgentStep(step, run, scope, workspaceDir, startedAt, signal);
        case "if":
          return await this.executeIfStep(step, run, scope, startedAt);
        case "switch":
          return await this.executeSwitchStep(step, run, scope, startedAt);
        case "merge":
          return await this.executeMergeStep(step, run, scope, startedAt);
        case "approval":
          return await this.executeApprovalStep(step, run, startedAt, signal);
        case "code":
          return await this.executeCodeStep(step, run, scope, startedAt);
        default:
          throw new Error(`Unsupported workflow step type: ${(step as WorkflowStep).type}`);
      }
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

  private async executeIfStep(
    step: WorkflowStep,
    run: WorkflowRun,
    scope: Record<string, unknown>,
    startedAt: string,
  ): Promise<WorkflowStepState> {
    const condition = step.condition || "true";
    const evaluated = await conditionEvaluator.evaluate(condition, scope);
    const activeBranch = Boolean(evaluated) ? "true" : "false";

    return {
      stepId: step.id,
      status: "success",
      startedAt,
      completedAt: new Date().toISOString(),
      activeBranch,
      outputs: { activeBranch, conditionResult: evaluated },
    };
  }

  private async executeSwitchStep(
    step: WorkflowStep,
    run: WorkflowRun,
    scope: Record<string, unknown>,
    startedAt: string,
  ): Promise<WorkflowStepState> {
    const condition = step.condition || "";
    const evaluated = await conditionEvaluator.evaluate(condition, scope);
    const activeBranch = String(evaluated);

    return {
      stepId: step.id,
      status: "success",
      startedAt,
      completedAt: new Date().toISOString(),
      activeBranch,
      outputs: { activeBranch, conditionResult: evaluated },
    };
  }

  private async executeMergeStep(
    step: WorkflowStep,
    run: WorkflowRun,
    scope: Record<string, unknown>,
    startedAt: string,
  ): Promise<WorkflowStepState> {
    return {
      stepId: step.id,
      status: "success",
      startedAt,
      completedAt: new Date().toISOString(),
      outputs: { merged: true },
    };
  }

  private async executeApprovalStep(
    step: WorkflowStep,
    run: WorkflowRun,
    startedAt: string,
    signal?: AbortSignal,
  ): Promise<WorkflowStepState> {
    const message = step.approvalMessage || `Approval required for step '${step.label}'`;
    workflowRunStore.updateStepState(run.username, run.id, step.id, {
      status: "waiting_approval",
      startedAt,
    });

    this.deps.eventBus?.emit("workflow_approval_requested", {
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

  private async executeCodeStep(
    step: WorkflowStep,
    run: WorkflowRun,
    scope: Record<string, unknown>,
    startedAt: string,
  ): Promise<WorkflowStepState> {
    const code = step.codeSnippet || "return {};";
    const outputs = await codeSandbox.executeCode(code, scope, {
      timeoutMs: step.codeTimeout || 5000,
    });

    return {
      stepId: step.id,
      status: "success",
      startedAt,
      completedAt: new Date().toISOString(),
      outputs,
    };
  }
}
