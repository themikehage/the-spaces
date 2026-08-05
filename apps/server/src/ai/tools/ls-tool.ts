// SPDX-License-Identifier: MIT
import { createLsTool, LsTool } from "./ls.tool";

export { createLsTool, LsTool };

export function createLsToolDefinition(cwd: string, allowedDirs?: string[]) {
  const tool = createLsTool(cwd, allowedDirs);
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    execute: (toolCallId: string, args: any, signal?: AbortSignal) =>
      tool.execute(toolCallId, args, { toolCallId, signal }),
  };
}
