// SPDX-License-Identifier: MIT
import {
  BashExecuteParams,
  BashExecuteResult,
  BashSpawnContext,
  BashSpawnHook,
  BashTool,
  BashToolOptions,
  createBashTool,
  verifyCommandSafety,
} from "./tools/bash.tool";

export { BashTool, createBashTool, verifyCommandSafety };
export type {
  BashExecuteParams,
  BashExecuteResult,
  BashSpawnContext,
  BashSpawnHook,
  BashToolOptions,
};

export interface ToolDefinition<TParams = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  execute: (
    toolCallIdOrArgs: string | TParams,
    argsOrContext?: TParams | { signal?: AbortSignal; abortSignal?: AbortSignal },
    maybeSignal?: AbortSignal,
  ) => Promise<TResult>;
}

export function createBashToolDefinition(
  cwd: string,
  options?: BashToolOptions,
): ToolDefinition<BashExecuteParams, BashExecuteResult> {
  const tool = createBashTool(cwd, options);
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    execute: async (
      toolCallIdOrArgs: string | BashExecuteParams,
      argsOrContext?: BashExecuteParams | { signal?: AbortSignal; abortSignal?: AbortSignal },
      maybeSignal?: AbortSignal,
    ): Promise<BashExecuteResult> => {
      let command: string;
      let timeout: number | undefined;
      let signal: AbortSignal | undefined;
      let toolCallId = "bash-call";

      if (typeof toolCallIdOrArgs === "string") {
        toolCallId = toolCallIdOrArgs;
        const typedArgs = argsOrContext as BashExecuteParams;
        command = typedArgs?.command;
        timeout = typedArgs?.timeout;
        signal = maybeSignal;
      } else {
        command = toolCallIdOrArgs?.command;
        timeout = toolCallIdOrArgs?.timeout;
        const ctx = argsOrContext as { signal?: AbortSignal; abortSignal?: AbortSignal };
        signal = ctx?.signal || ctx?.abortSignal;
      }

      return tool.execute(toolCallId, { command, timeout }, { toolCallId, signal });
    },
  };
}
