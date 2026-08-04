// SPDX-License-Identifier: MIT
import type {
  AfterToolCallContext,
  AfterToolCallResult,
  BeforeToolCallContext,
  BeforeToolCallResult,
} from "../../ai/vendor/agent/src/types";

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
}
