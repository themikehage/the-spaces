// SPDX-License-Identifier: MIT
import type { WorkflowDefinition } from "shared";

export interface IWorkflowScheduler {
  registerWorkflow(username: string, def: WorkflowDefinition): void;
  unregisterWorkflow(workflowId: string): void;
  syncWorkflow(username: string, def: WorkflowDefinition): void;
  stopAll(): void;
}
