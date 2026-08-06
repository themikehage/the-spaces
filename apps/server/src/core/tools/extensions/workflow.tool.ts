// SPDX-License-Identifier: MIT
import type { IWorkflowEngine } from "../../ports/workflow-engine.port";

export interface CreateWorkflowToolsOptions {
  username: string;
  sessionId: string;
  workflowEngine?: IWorkflowEngine;
}

export function createWorkflowTools(opts: CreateWorkflowToolsOptions) {
  if (!opts.workflowEngine) return [];

  const engine = opts.workflowEngine;

  return [
    {
      name: "list_workflows",
      description:
        "Lists all available workflows for the user with their details and step configurations.",
      parameters: {
        type: "object",
        properties: {
          scopeType: {
            type: "string",
            description: "Optional filter by scope: global, team, project, agent",
          },
          entityId: { type: "string", description: "Optional filter by entity ID" },
        },
      },
      execute: async (_id: string, args: { scopeType?: string; entityId?: string }) => {
        const workflows = engine.list(opts.username, args);
        return {
          content: [{ type: "text", text: JSON.stringify(workflows, null, 2) }],
        };
      },
    },
    {
      name: "run_workflow",
      description: "Executes a workflow by its ID with optional input variables.",
      parameters: {
        type: "object",
        properties: {
          workflowId: { type: "string", description: "Unique identifier of the workflow to run" },
          inputs: { type: "object", description: "Key-value input parameters for the workflow" },
        },
        required: ["workflowId"],
      },
      execute: async (
        _id: string,
        args: { workflowId: string; inputs?: Record<string, unknown> },
      ) => {
        const run = await engine.run(opts.username, args.workflowId, {
          inputs: args.inputs,
          parentSessionId: opts.sessionId,
        });
        return {
          content: [{ type: "text", text: `Workflow started successfully. Run ID: ${run.id}` }],
          details: { run },
        };
      },
    },
    {
      name: "get_workflow_status",
      description: "Gets the current execution status and step states of a workflow run.",
      parameters: {
        type: "object",
        properties: {
          runId: { type: "string", description: "The execution run ID to check" },
        },
        required: ["runId"],
      },
      execute: async (_id: string, args: { runId: string }) => {
        const status = engine.getRunStatus(opts.username, args.runId);
        if (!status) {
          return {
            content: [{ type: "text", text: `Workflow run '${args.runId}' not found.` }],
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
        };
      },
    },
  ];
}
