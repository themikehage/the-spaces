// SPDX-License-Identifier: MIT
import { createEditTool, EditTool } from "./edit.tool";

export { createEditTool, EditTool };

export function createEditToolDefinition(cwd: string, allowedDirs?: string[]) {
  const tool = createEditTool(cwd, allowedDirs);
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    execute: (toolCallId: string, args: any, signal?: AbortSignal) =>
      tool.execute(toolCallId, args, { toolCallId, signal }),
  };
}
