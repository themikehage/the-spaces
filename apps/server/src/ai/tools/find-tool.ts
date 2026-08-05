// SPDX-License-Identifier: MIT
import { createFindTool, FindTool } from "./find.tool";

export { createFindTool, FindTool };

export function createFindToolDefinition(cwd: string, allowedDirs?: string[]) {
  const tool = createFindTool(cwd, allowedDirs);
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    execute: (toolCallId: string, args: any, signal?: AbortSignal) =>
      tool.execute(toolCallId, args, { toolCallId, signal }),
  };
}
