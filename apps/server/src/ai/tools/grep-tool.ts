// SPDX-License-Identifier: MIT
import { createGrepTool, GrepTool } from "./grep.tool";

export { createGrepTool, GrepTool };

export function createGrepToolDefinition(cwd: string, allowedDirs?: string[]) {
  const tool = createGrepTool(cwd, allowedDirs);
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    execute: (toolCallId: string, args: any, signal?: AbortSignal) =>
      tool.execute(toolCallId, args, { toolCallId, signal }),
  };
}
