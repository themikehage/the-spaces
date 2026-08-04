// SPDX-License-Identifier: MIT
import type {
  AfterToolCallContext,
  AfterToolCallResult,
  BeforeToolCallContext,
  BeforeToolCallResult,
} from "../ai/vendor/agent/src/types";
import type { Hook, IHookRunner } from "./ports/hook.port";

export class HookRunner implements IHookRunner {
  private hooks: Hook[] = [];

  register(hook: Hook): void {
    this.hooks = this.hooks.filter((h) => h.id !== hook.id);
    this.hooks.push(hook);
    this.hooks.sort((a, b) => a.priority - b.priority);
  }

  unregister(hookId: string): void {
    this.hooks = this.hooks.filter((h) => h.id !== hookId);
  }

  async runBeforeToolCall(
    ctx: BeforeToolCallContext,
    signal?: AbortSignal,
  ): Promise<BeforeToolCallResult | undefined> {
    for (const hook of this.hooks) {
      if (!hook.beforeToolCall) continue;
      const result = await hook.beforeToolCall(ctx, signal);
      if (result?.block) return result;
    }
    return undefined;
  }

  async runAfterToolCall(
    ctx: AfterToolCallContext,
    signal?: AbortSignal,
  ): Promise<AfterToolCallResult | undefined> {
    let result: AfterToolCallResult | undefined;
    for (const hook of this.hooks) {
      if (!hook.afterToolCall) continue;
      const res = await hook.afterToolCall(ctx, signal);
      if (res !== undefined) {
        result = res;
      }
    }
    return result;
  }
}
