// SPDX-License-Identifier: MIT
import type { WorkflowDefinition, WorkflowRun, WorkflowRunOptions } from "shared";

export interface IWorkflowSessionBootstrapResult {
  workflowSessionId: string;
  cleanup: () => Promise<void>;
}

export interface IWorkflowSessionBootstrap {
  bootstrap(
    username: string,
    runId: string,
    workflowId: string,
    workspaceDir: string,
  ): Promise<IWorkflowSessionBootstrapResult>;
}

export interface IWorkflowEngine {
  save(username: string, def: WorkflowDefinition): Promise<WorkflowDefinition>;
  delete(username: string, workflowId: string): Promise<void>;
  list(username: string, filter?: { scopeType?: string; entityId?: string }): WorkflowDefinition[];
  get(username: string, workflowId: string): WorkflowDefinition | null;
  run(username: string, workflowId: string, opts?: WorkflowRunOptions): Promise<WorkflowRun>;
  getRunStatus(username: string, runId: string): WorkflowRun | null;
  abort(username: string, runId: string): Promise<void>;
  listRuns(username: string, workflowId: string): WorkflowRun[];
}
