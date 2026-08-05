import type { ToolContext, ToolResult } from "../types.ts";

export interface ToolCallContext {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  args: unknown;
  signal?: AbortSignal;
}

export interface Hook {
  readonly id: string;
  readonly priority: number;

  beforeToolCall?(ctx: ToolCallContext): Promise<ToolCallContext | null>;
  afterToolCall?(ctx: ToolCallContext, result: ToolResult): Promise<ToolResult>;
  onError?(error: Error): Promise<void>;
}

export interface IHookRunner {
  register(hook: Hook): void;
  runBeforeToolCall(ctx: ToolCallContext): Promise<ToolCallContext | null>;
  runAfterToolCall(ctx: ToolCallContext, result: ToolResult): Promise<ToolResult>;
  runOnError(error: Error): Promise<void>;
}
