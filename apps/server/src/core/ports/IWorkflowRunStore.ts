// SPDX-License-Identifier: MIT
import type { WorkflowRun, WorkflowStepState } from "shared";

export interface CreateWorkflowRunParams {
  username: string;
  workflowId: string;
  workflowName: string;
  inputs: Record<string, unknown>;
  stepIds: string[];
  parentSessionId?: string;
}

export interface ListWorkflowRunsFilter {
  workflowId?: string;
  status?: string;
  limit?: number;
}

export interface IWorkflowRunStore {
  saveRun(username: string, run: WorkflowRun): WorkflowRun;
  createRun(params: CreateWorkflowRunParams): WorkflowRun;
  getRun(username: string, runId: string, workflowId?: string): WorkflowRun | null;
  updateRunStatus(
    username: string,
    runId: string,
    status: WorkflowRun["status"],
    completedAt?: string,
  ): WorkflowRun | null;
  setWorkflowSessionId(username: string, runId: string, workflowSessionId: string): WorkflowRun | null;
  updateStepState(
    username: string,
    runId: string,
    stepId: string,
    update: Partial<WorkflowStepState>,
  ): WorkflowRun | null;
  listRuns(username: string, filter?: ListWorkflowRunsFilter | string): WorkflowRun[];
  cleanupStaleRuns(username?: string): number;
}
