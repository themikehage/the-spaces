// SPDX-License-Identifier: MIT
import type { WorkflowRun } from "shared";
import type { IWorkflowEngine } from "../../../ports/workflow-engine.port";
import { workflowApprovalStore } from "../../../workflows/workflow-approval-store";

export interface WorkflowRunActionsOptions {
  username: string;
  sessionId: string;
  workflowEngine?: IWorkflowEngine;
}

export class WorkflowRunActions {
  constructor(private opts: WorkflowRunActionsOptions) {}

  private checkEngine(): IWorkflowEngine {
    if (!this.opts.workflowEngine) {
      throw new Error(
        "Workflow engine is not initialized for this session. Execute 'contract' action to see schema.",
      );
    }
    return this.opts.workflowEngine;
  }

  async run(params: {
    workflowId: string;
    inputs?: Record<string, unknown>;
    dryRun?: boolean;
  }): Promise<WorkflowRun> {
    const engine = this.checkEngine();
    return engine.run(this.opts.username, params.workflowId, {
      inputs: params.inputs,
      parentSessionId: this.opts.sessionId,
      dryRun: params.dryRun,
    });
  }

  getRun(runId: string): WorkflowRun {
    const engine = this.checkEngine();
    const run = engine.getRunStatus(this.opts.username, runId);
    if (!run) {
      throw new Error(`Workflow run '${runId}' not found.`);
    }
    return run;
  }

  listRuns(filter?: { workflowId?: string; status?: string; limit?: number } | string): WorkflowRun[] {
    const engine = this.checkEngine();
    return engine.listRuns(this.opts.username, filter);
  }

  async abort(runId: string): Promise<void> {
    const engine = this.checkEngine();
    await engine.abort(this.opts.username, runId);
  }

  approve(params: { runId: string; stepId: string; approved: boolean }): boolean {
    const resolved = workflowApprovalStore.resolveApproval(
      params.runId,
      params.stepId,
      params.approved,
    );
    if (!resolved) {
      throw new Error(
        `Pending approval not found for run '${params.runId}' and step '${params.stepId}'.`,
      );
    }
    return true;
  }
}
