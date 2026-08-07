// SPDX-License-Identifier: MIT
import type {
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunOptions,
  WorkflowStepState,
} from "shared";
import type { DelegationRegistry } from "../delegation/delegation-registry";
import type { EventBus } from "../ports/spaces-host.port";
import type {
  IWorkflowEngine,
  IWorkflowSessionBootstrap,
} from "../ports/workflow-engine.port";
import type { SessionManager } from "../session/session-manager";
import { inactiveBranchIds, unhandledErrorBranchIds } from "./branch-pruner";
import { resolveExecutionOrder } from "./dag-resolver";
import type { ExpressionContext } from "./expression-engine";
import { StepExecutor } from "./step-executor";
import { workflowRunStore } from "./workflow-run-store";
import { workflowSessionBootstrap } from "./workflow-session-bootstrap";
import { workflowStore } from "./workflow-store";

import type { ICredentialStore } from "../ports/credential-store.port";
import type { IHttpClient } from "../ports/http-client.port";

export interface WorkflowEngineOptions {
  sessionManager?: SessionManager;
  delegationRegistry?: DelegationRegistry;
  getSessionManager?: () => SessionManager;
  getDelegationRegistry?: () => DelegationRegistry;
  eventBus?: EventBus;
  workspaceDir?: string;
  getWorkspaceDir?: (username: string, projectId?: string, workflowId?: string) => string;
  sessionBootstrap?: IWorkflowSessionBootstrap;
  httpClient?: IHttpClient;
  credentialStore?: ICredentialStore;
}

export class WorkflowEngine implements IWorkflowEngine {
  private activeRuns = new Map<string, AbortController>();
  private _stepExecutor?: StepExecutor;

  constructor(private opts: WorkflowEngineOptions) {
    workflowRunStore.cleanupStaleRuns();
  }

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
        httpClient: this.opts.httpClient,
        credentialStore: this.opts.credentialStore,
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

    const workspaceDir = this.opts.getWorkspaceDir
      ? this.opts.getWorkspaceDir(username, opts?.projectId, workflowId)
      : this.opts.workspaceDir || process.cwd();

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
    const sessionBootstrap = this.opts.sessionBootstrap || workflowSessionBootstrap;
    const { workflowSessionId, cleanup } = await sessionBootstrap.bootstrap(
      username,
      run.id,
      def.id,
      workspaceDir,
    );
    workflowRunStore.setWorkflowSessionId(username, run.id, workflowSessionId);

    const updatedRun = workflowRunStore.getRun(username, run.id) || {
      ...run,
      workflowSessionId,
    };

    try {
      await this.runDAGExecution(username, def, updatedRun, workspaceDir, signal, dryRun);
    } finally {
      await cleanup();
    }
  }

  private async runDAGExecution(
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
        const stepOnError = step.onError ?? def.onError;
        const stepRetryCount = step.retryCount ?? def.retryCount ?? 1;
        const maxAttempts = stepOnError === "retry" ? stepRetryCount + 1 : 1;
        const retryDelayMs = step.retryDelayMs ?? 0;
        let lastState: WorkflowStepState = { stepId: step.id, status: "pending" };

        while (attempts < maxAttempts) {
          if (attempts > 0 && retryDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          }
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

        if (
          (lastState.status === "success" || lastState.status === "pinned") &&
          step.errorBranch &&
          step.errorBranch.length > 0
        ) {
          for (const id of unhandledErrorBranchIds(def.steps, step.id)) {
            skippedStepIds.add(id);
          }
        }

        // If step is a control-flow branch, prune the entire unselected branch
        // subgraph (transitive downstream), not just the direct branch targets.
        if (
          lastState.status === "success" &&
          step.branches &&
          lastState.activeBranch !== undefined &&
          lastState.activeBranch !== ""
        ) {
          for (const id of inactiveBranchIds(def.steps, step.id, lastState.activeBranch)) {
            skippedStepIds.add(id);
          }
        }

        return { step, state: lastState };
      });

      const results = await Promise.allSettled(batchPromises);

      let hasUnhandledError = false;
      for (const res of results) {
        if (res.status === "rejected") {
          hasUnhandledError = true;
        } else if (res.status === "fulfilled") {
          const { step, state } = res.value;
          exprContext.$steps[step.id] = state;
          (exprContext as Record<string, unknown>)[step.id] = { outputs: state.outputs };
          (exprContext as Record<string, unknown>)[`$${step.id}`] = { outputs: state.outputs };
          if (state.outputs) {
            Object.assign(exprContext as Record<string, unknown>, state.outputs);
          }

          if (state.status === "error") {
            const stepOnError = step.onError ?? def.onError;
            const hasErrorBranch = Boolean(step.errorBranch && step.errorBranch.length > 0);
            if (stepOnError === "stop" && !hasErrorBranch) {
              hasUnhandledError = true;
            }
          }
        }
      }

      if (hasUnhandledError) {
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
