// SPDX-License-Identifier: MIT
import { createReadTool, ReadTool } from "./read.tool";

export { createReadTool, ReadTool };

export function createReadToolDefinition(cwd: string, allowedDirs?: string[]) {
  const tool = createReadTool(cwd, allowedDirs);
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    execute: (toolCallId: string, args: any, signal?: AbortSignal) =>
      tool.execute(toolCallId, args, { toolCallId, signal }),
  };
}
