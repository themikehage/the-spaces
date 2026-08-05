// SPDX-License-Identifier: MIT

export interface BeforeToolCallResult {
  block?: boolean;
  reason?: string;
}

export interface AfterToolCallResult {
  content?: unknown[];
  details?: unknown;
  isError?: boolean;
  terminate?: boolean;
}

export interface BeforeToolCallContext {
  toolCallId?: string;
  toolName?: string;
  args: unknown;
  assistantMessage?: unknown;
  toolCall?: unknown;
  context?: unknown;
  [key: string]: unknown;
}

export interface AfterToolCallContext {
  toolCallId?: string;
  toolName?: string;
  args: unknown;
  result: unknown;
  isError?: boolean;
  assistantMessage?: unknown;
  toolCall?: unknown;
  context?: unknown;
  [key: string]: unknown;
}

export interface Hook {
  id: string;
  priority: number;
  beforeToolCall?(
    ctx: BeforeToolCallContext,
    signal?: AbortSignal,
  ): Promise<BeforeToolCallResult | undefined>;
  afterToolCall?(
    ctx: AfterToolCallContext,
    signal?: AbortSignal,
  ): Promise<AfterToolCallResult | undefined>;
  onError?(error: Error): Promise<void>;
}

export interface IHookRunner {
  register(hook: Hook): void;
  unregister(hookId: string): void;
  runBeforeToolCall(
    ctx: BeforeToolCallContext,
    signal?: AbortSignal,
  ): Promise<BeforeToolCallResult | undefined>;
  runAfterToolCall(
    ctx: AfterToolCallContext,
    signal?: AbortSignal,
  ): Promise<AfterToolCallResult | undefined>;
  runOnError(error: Error): Promise<void>;
}
