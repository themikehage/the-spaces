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
import { resolveExecutionOrder } from "./dag-resolver";
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

    // Async execution of DAG without blocking the response
    this.executeDAG(username, def, run, workspaceDir, abortController.signal)
      .catch((err) => {
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
  ): Promise<void> {
    const batches = resolveExecutionOrder(def.steps);
    const scope: Record<string, unknown> = {
      inputs: run.inputs,
      ...run.inputs,
    };

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
        let attempts = 0;
        const maxAttempts = def.onError === "retry" ? (def.retryCount || 1) + 1 : 1;
        let lastState: WorkflowStepState = { stepId: step.id, status: "pending" };

        while (attempts < maxAttempts) {
          attempts++;
          lastState = await this.stepExecutor.execute(step, run, scope, workspaceDir, signal);
          if (lastState.status === "success" || signal.aborted) break;
        }

        workflowRunStore.updateStepState(username, run.id, step.id, lastState);

        this.opts.eventBus?.emit("workflow_step_completed", {
          runId: run.id,
          stepId: step.id,
          status: lastState.status,
          outputs: lastState.outputs,
        });

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
        } else if (res.status === "fulfilled" && res.value.state.outputs) {
          scope[res.value.step.id] = { outputs: res.value.state.outputs };
          Object.assign(scope, res.value.state.outputs);
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
