// SPDX-License-Identifier: MIT
import type { IWorkflowEngine } from "../../ports/workflow-engine.port";
import { createManageWorkflowTool } from "./manage-workflow";

export interface CreateWorkflowToolsOptions {
  username: string;
  sessionId: string;
  workflowEngine?: IWorkflowEngine;
}

export function createWorkflowTools(opts: CreateWorkflowToolsOptions) {
  return [createManageWorkflowTool(opts)];
}

export { createManageWorkflowTool };
