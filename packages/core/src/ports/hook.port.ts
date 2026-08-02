import type { PromptContext, ToolCallContext, ToolResult } from "../types.js";

export interface Hook {
  readonly id: string;
  readonly priority: number;
  beforePrompt?(ctx: PromptContext): Promise<PromptContext>;
  afterPrompt?(result: string): Promise<string>;
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
