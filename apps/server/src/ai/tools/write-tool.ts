// SPDX-License-Identifier: MIT
import { createWriteTool, WriteTool } from "./write.tool";

export { createWriteTool, WriteTool };

export function createWriteToolDefinition(cwd: string, allowedDirs?: string[]) {
  const tool = createWriteTool(cwd, allowedDirs);
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    execute: (toolCallId: string, args: any, signal?: AbortSignal) =>
      tool.execute(toolCallId, args, { toolCallId, signal }),
  };
}
