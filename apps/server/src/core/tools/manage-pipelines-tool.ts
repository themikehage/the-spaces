// SPDX-License-Identifier: MIT
import type { FactoryToolOptions } from "./factory-tool";
import { broadcastToUser } from "../../ws/handler";
import { PipelineStageSchema } from "shared";
import { z } from "zod";

function ok(text: string, details?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text }],
    details: details ?? {},
  };
}

function err(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    isError: true,
  };
}

export function createManagePipelinesTool(opts: FactoryToolOptions) {
  const { username } = opts;

  return {
    name: "manage_pipelines",
    description: `Manage Spaces deterministic linear execution pipelines.
Allows listing pipelines, creating/updating definitions, running executions, aborting them, viewing logs/raw outputs, and reading/patching execution scripts.

Actions:
- get: List all pipelines, get a specific pipeline definition (and its scripts), list pipeline runs, or view a specific run summary.
- upsert: Create or update a pipeline definition. Can optionally include scripts inline.
- delete: Permanently remove a pipeline.
- run: Trigger a pipeline execution in the background (fire-and-forget). Returns a runId immediately.
- abort: Abort a running pipeline execution.
- get_run: Retrieve detailed execution status including raw outputs, stderr, and token usage for all stages of a specific run.
- read_script: Retrieve the script file content.
- patch_script: Update or write a single execution script.`,

    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["get", "upsert", "delete", "run", "abort", "get_run", "read_script", "patch_script"],
          description: "The action to perform on the pipelines.",
        },
        id: {
          type: "string",
          description: "The pipeline ID. Required for all actions except 'get' when listing all pipelines. For get runs/detail, format id as 'pipeline-id/runs' or 'pipeline-id/runs/run-id'.",
        },
        params: {
          type: "object",
          description: "Action-specific parameters: \n" +
            "- upsert: { name: string, description?: string, stages: PipelineStage[], scripts?: Record<string, string> }\n" +
            "- abort: { runId: string }\n" +
            "- get_run: { runId: string }\n" +
            "- read_script: { scriptName: string }\n" +
            "- patch_script: { scriptName: string, content: string }",
        },
      },
      required: ["action"],
    },

    execute: async (_toolCallId: string, _args: any) => {
      return err("Pipelines execution engine is currently disabled or uninstalled.");
    },
  };
}
