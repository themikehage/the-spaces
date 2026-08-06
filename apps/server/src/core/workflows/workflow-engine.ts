// SPDX-License-Identifier: MIT
import type {
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunOptions,
  WorkflowStepState,
} from "shared";
import type { DelegationRegistry } from "../delegation/delegation-registry";
import type { EventBus } from "../ports/spaces-host.port";
import type { IWorkflowEngine } from "../ports/workflow-engine.port";
import type { SessionManager } from "../session/session-manager";
import { inactiveBranchIds } from "./branch-pruner";
import { resolveExecutionOrder } from "./dag-resolver";
import type { ExpressionContext } from "./expression-engine";
import { StepExecutor } from "./step-executor";
import { workflowRunStore } from "./workflow-run-store";
import { workflowStore } from "./workflow-store";

export interface WorkflowEngineOptions {
  sessionManager?: SessionManager;
  delegationRegistry?: DelegationRegistry;
  getSessionManager?: () => SessionManager;
  getDelegationRegistry?: () => DelegationRegistry;
  eventBus?: EventBus;
  workspaceDir?: string;
}

export class WorkflowEngine implements IWorkflowEngine {
  private activeRuns = new Map<string, AbortController>();
  private _stepExecutor?: StepExecutor;

  constructor(private opts: WorkflowEngineOptions) {}

  private get stepExecutor(): StepExecutor {
    if (!this._stepExecutor) {
      const sm = this.opts.sessionManager || this.opts.getSessionManager?.();
      const dr = this.opts.delegationRegistry || this.opts.getDelegationRegistry?.();
      if (!sm || !dr) {
        throw new Error("WorkflowEngine requires sessionManager and delegationRegistry");
      }
      this._stepExecutor = new StepExecutor({
        sessionManager: sm,
        delegationRegistry: dr,
        eventBus: this.opts.eventBus,
      });
    }
    return this._stepExecutor;
  }

  async save(username: string, def: WorkflowDefinition): Promise<WorkflowDefinition> {
    return workflowStore.save(username, def);
  }

  async delete(username: string, workflowId: string): Promise<void> {
    workflowStore.delete(username, workflowId);
  }

  list(username: string, filter?: { scopeType?: string; entityId?: string }): WorkflowDefinition[] {
    return workflowStore.list(username, filter);
  }

  get(username: string, workflowId: string): WorkflowDefinition | null {
    return workflowStore.get(username, workflowId);
  }

  async run(username: string, workflowId: string, opts?: WorkflowRunOptions): Promise<WorkflowRun> {
    const def = this.get(username, workflowId);
    if (!def) {
      throw new Error(`Workflow definition '${workflowId}' not found.`);
    }

    const stepIds = def.steps.map((s) => s.id);
    const run = workflowRunStore.createRun({
      username,
      workflowId: def.id,
      workflowName: def.name,
      inputs: opts?.inputs || {},
      stepIds,
      parentSessionId: opts?.parentSessionId,
    });

    const abortController = new AbortController();
    this.activeRuns.set(run.id, abortController);

    this.opts.eventBus?.emit("workflow_run_started", {
      runId: run.id,
      workflowId: def.id,
      workflowName: def.name,
    });

    workflowRunStore.updateRunStatus(username, run.id, "running");

    const workspaceDir = this.opts.workspaceDir || process.cwd();

    this.executeDAG(username, def, run, workspaceDir, abortController.signal, opts?.dryRun)
      .catch(() => {
        workflowRunStore.updateRunStatus(username, run.id, "error");
        this.opts.eventBus?.emit("workflow_run_completed", {
          runId: run.id,
          status: "error",
        });
      })
      .finally(() => {
        this.activeRuns.delete(run.id);
      });

    return workflowRunStore.getRun(username, run.id) || run;
  }

  private async executeDAG(
    username: string,
    def: WorkflowDefinition,
    run: WorkflowRun,
    workspaceDir: string,
    signal: AbortSignal,
    dryRun?: boolean,
  ): Promise<void> {
    const batches = resolveExecutionOrder(def.steps);
    const skippedStepIds = new Set<string>();

    const exprContext: ExpressionContext = {
      $inputs: run.inputs,
      $steps: {},
      steps: {},
      $run: {
        id: run.id,
        workflowId: def.id,
        workflowName: def.name,
        status: "running",
      },
      inputs: run.inputs,
      ...run.inputs,
    };

    exprContext.steps = exprContext.$steps;

    for (const batch of batches) {
      if (signal.aborted) {
        workflowRunStore.updateRunStatus(username, run.id, "cancelled");
        this.opts.eventBus?.emit("workflow_run_completed", {
          runId: run.id,
          status: "cancelled",
        });
        return;
      }

      const batchPromises = batch.map(async (step) => {
        if (skippedStepIds.has(step.id)) {
          const skippedState: WorkflowStepState = {
            stepId: step.id,
            status: "skipped",
            completedAt: new Date().toISOString(),
          };
          workflowRunStore.updateStepState(username, run.id, step.id, skippedState);
          this.opts.eventBus?.emit("workflow_step_completed", {
            runId: run.id,
            stepId: step.id,
            status: "skipped",
          });
          return { step, state: skippedState };
        }

        let attempts = 0;
        const maxAttempts = def.onError === "retry" ? (def.retryCount || 1) + 1 : 1;
        let lastState: WorkflowStepState = { stepId: step.id, status: "pending" };

        while (attempts < maxAttempts) {
          attempts++;
          lastState = await this.stepExecutor.execute(
            step,
            run,
            exprContext as unknown as Record<string, unknown>,
            workspaceDir,
            signal,
            dryRun,
          );
          if (lastState.status === "success" || lastState.status === "pinned" || signal.aborted) {
            break;
          }
        }

        workflowRunStore.updateStepState(username, run.id, step.id, lastState);

        this.opts.eventBus?.emit("workflow_step_completed", {
          runId: run.id,
          stepId: step.id,
          status: lastState.status,
          outputs: lastState.outputs,
        });

        // If step is a control-flow branch, prune the entire unselected branch
        // subgraph (transitive downstream), not just the direct branch targets.
        if (lastState.status === "success" && step.branches && lastState.activeBranch) {
          for (const id of inactiveBranchIds(def.steps, step.id, lastState.activeBranch)) {
            skippedStepIds.add(id);
          }
        }

        return { step, state: lastState };
      });

      const results = await Promise.allSettled(batchPromises);

      let hasError = false;
      for (const res of results) {
        if (
          res.status === "rejected" ||
          (res.status === "fulfilled" && res.value.state.status === "error")
        ) {
          hasError = true;
        } else if (res.status === "fulfilled") {
          const { step, state } = res.value;
          exprContext.$steps[step.id] = state;
          (exprContext as Record<string, unknown>)[step.id] = { outputs: state.outputs };
          if (state.outputs) {
            Object.assign(exprContext as Record<string, unknown>, state.outputs);
          }
        }
      }

      if (hasError && def.onError === "stop") {
        workflowRunStore.updateRunStatus(username, run.id, "error");
        this.opts.eventBus?.emit("workflow_run_completed", {
          runId: run.id,
          status: "error",
        });
        return;
      }
    }

    workflowRunStore.updateRunStatus(username, run.id, "success");
    this.opts.eventBus?.emit("workflow_run_completed", {
      runId: run.id,
      status: "success",
    });
  }

  getRunStatus(username: string, runId: string): WorkflowRun | null {
    return workflowRunStore.getRun(username, runId);
  }

  async abort(username: string, runId: string): Promise<void> {
    const controller = this.activeRuns.get(runId);
    if (controller) {
      controller.abort();
      this.activeRuns.delete(runId);
    }
    workflowRunStore.updateRunStatus(username, runId, "cancelled");
    this.opts.eventBus?.emit("workflow_run_completed", {
      runId,
      status: "cancelled",
    });
  }

  listRuns(username: string, workflowId: string): WorkflowRun[] {
    return workflowRunStore.listRuns(username, workflowId);
  }
}
