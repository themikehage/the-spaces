// SPDX-License-Identifier: MIT
﻿import { recordToolCallAudit } from "../audit-log";

export interface CreateAfterToolCallHookParams {
  sessionId: string;
  username: string;
}

export interface AfterToolCallContext {
  toolName: string;
  args?: Record<string, unknown>;
  durationMs?: number;
  isError?: boolean;
  errorMessage?: string;
  agentId?: string;
  parentSessionId?: string;
}

export function createAfterToolCallHook({ sessionId, username }: CreateAfterToolCallHookParams) {
  return async (context: AfterToolCallContext): Promise<void> => {
    if (!context || !context.toolName) return;

    recordToolCallAudit(username, {
      sessionId,
      parentSessionId: context.parentSessionId,
      agentId: context.agentId,
      toolName: context.toolName,
      durationMs: context.durationMs ?? 0,
      status: context.isError ? "error" : "success",
      argsSummary: context.args,
      errorMsg: context.errorMessage,
    });
  };
}
