// SPDX-License-Identifier: MIT
import type { IToolRegistry, ToolContext } from "./tool.port";

export interface ToolCallExecution {
  toolCallId: string;
  toolName: string;
  args: unknown;
}

export interface IToolExecutor {
  getRegistry(): IToolRegistry;
  execute(call: ToolCallExecution, ctx?: ToolContext): Promise<any>;
}
