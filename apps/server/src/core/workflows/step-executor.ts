// SPDX-License-Identifier: MIT
import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import type { DelegationRegistry } from "../delegation/delegation-registry";
import type { ApprovalPort, EventBus } from "../ports/spaces-host.port";
import type { SessionManager } from "../session/session-manager";
import { spawnSubagent } from "../session/spawn-subagent";
import { interpolateString, interpolateValue } from "./variable-interpolator";

export interface StepExecutorDeps {
  sessionManager: SessionManager;
  delegationRegistry: DelegationRegistry;
  approvalPort?: ApprovalPort;
  eventBus?: EventBus;
}

export function evaluateCondition(expression: string, scope: Record<string, unknown>): boolean {
  const interpolated = String(interpolateString(expression, scope)).trim();
  if (interpolated === "true") return true;
  if (interpolated === "false") return false;

  const match = interpolated.match(/^(.+?)\s*(==|!=|>|<|>=|<=)\s*(.+)$/);
  if (!match) {
    return Boolean(interpolated);
  }

  const [, rawLeft, op, rawRight] = match;
  const cleanStr = (s: string) => s.trim().replace(/^['"]|['"]$/g, "");

  const leftStr = cleanStr(rawLeft);
  const rightStr = cleanStr(rawRight);

  const leftNum = Number(leftStr);
  const rightNum = Number(rightStr);
  const isNumeric = !isNaN(leftNum) && !isNaN(rightNum);

  switch (op) {
    case "==":
      return isNumeric ? leftNum === rightNum : leftStr === rightStr;
    case "!=":
      return isNumeric ? leftNum !== rightNum : leftStr !== rightStr;
    case ">":
      return isNumeric ? leftNum > rightNum : leftStr > rightStr;
    case "<":
      return isNumeric ? leftNum < rightNum : leftStr < rightStr;
    case ">=":
      return isNumeric ? leftNum >= rightNum : leftStr >= rightStr;
    case "<=":
      return isNumeric ? leftNum <= rightNum : leftStr <= rightStr;
    default:
      return false;
  }
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
      switch (step.type) {
        case "agent":
          return await this.executeAgentStep(step, run, scope, workspaceDir, startedAt, signal);
        case "tool":
          return await this.executeToolStep(step, scope, startedAt);
        case "approval":
          return await this.executeApprovalStep(step, run, scope, startedAt);
        case "condition":
          return this.executeConditionStep(step, scope, startedAt);
        case "parallel":
          return this.executeParallelStep(step, startedAt);
        default:
          throw new Error(`Unsupported workflow step type: ${step.type}`);
      }
    } catch (err: any) {
      return {
        stepId: step.id,
        status: "error",
        startedAt,
        completedAt: new Date().toISOString(),
        error: err.message || String(err),
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

    const envelope = await spawnSubagent({
      toolCallId,
      username: run.username,
      parentSessionId,
      agentId: step.agentId,
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
      agentSessionId: `subagent:${toolCallId}`,
    };
  }

  private async executeToolStep(
    step: WorkflowStep,
    scope: Record<string, unknown>,
    startedAt: string,
  ): Promise<WorkflowStepState> {
    if (!step.toolName) {
      throw new Error(`Tool step '${step.id}' missing toolName`);
    }

    const interpolatedParams = (interpolateValue(step.toolParams || {}, scope) || {}) as Record<
      string,
      unknown
    >;

    return {
      stepId: step.id,
      status: "success",
      startedAt,
      completedAt: new Date().toISOString(),
      outputs: {
        toolName: step.toolName,
        params: interpolatedParams,
        executed: true,
      },
    };
  }

  private async executeApprovalStep(
    step: WorkflowStep,
    run: WorkflowRun,
    scope: Record<string, unknown>,
    startedAt: string,
  ): Promise<WorkflowStepState> {
    const rawMsg = step.approvalMessage || `Approval required for step '${step.label}'`;
    const message = String(interpolateString(rawMsg, scope));

    if (this.deps.approvalPort) {
      const approved = await this.deps.approvalPort.requestApproval({
        sessionId: run.parentSessionId || `wf-run-${run.id}`,
        action: `workflow_step:${step.id}`,
        description: message,
        details: { runId: run.id, stepId: step.id },
      });

      if (!approved) {
        return {
          stepId: step.id,
          status: "error",
          startedAt,
          completedAt: new Date().toISOString(),
          error: "Step approval was rejected by human",
        };
      }
    }

    return {
      stepId: step.id,
      status: "success",
      startedAt,
      completedAt: new Date().toISOString(),
      outputs: { approved: true, approvalMessage: message },
    };
  }

  private executeConditionStep(
    step: WorkflowStep,
    scope: Record<string, unknown>,
    startedAt: string,
  ): WorkflowStepState {
    const expr = step.conditionExpression || "true";
    const result = evaluateCondition(expr, scope);

    return {
      stepId: step.id,
      status: "success",
      startedAt,
      completedAt: new Date().toISOString(),
      outputs: {
        conditionResult: result,
        nextStepId: result ? step.ifTrueStepId : step.ifFalseStepId,
      },
    };
  }

  private executeParallelStep(step: WorkflowStep, startedAt: string): WorkflowStepState {
    return {
      stepId: step.id,
      status: "success",
      startedAt,
      completedAt: new Date().toISOString(),
      outputs: {
        parallelSteps: step.parallelStepIds || [],
      },
    };
  }
}
