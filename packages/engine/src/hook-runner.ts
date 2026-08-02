import type { Hook, IHookRunner, ToolCallContext, ToolResult } from "@spaces/core";

export class HookRunner implements IHookRunner {
  private hooks: Hook[] = [];

  register(hook: Hook): void {
    this.hooks.push(hook);
    this.hooks.sort((a, b) => a.priority - b.priority);
  }

  async runBeforeToolCall(ctx: ToolCallContext): Promise<ToolCallContext | null> {
    let currentCtx: ToolCallContext = ctx;
    for (const hook of this.hooks) {
      if (!hook.beforeToolCall) continue;
      const nextCtx = await hook.beforeToolCall(currentCtx);
      if (nextCtx === null) {
        return null;
      }
      currentCtx = nextCtx;
    }
    return currentCtx;
  }

  async runAfterToolCall(ctx: ToolCallContext, result: ToolResult): Promise<ToolResult> {
    let currentResult: ToolResult = result;
    for (const hook of this.hooks) {
      if (!hook.afterToolCall) continue;
      currentResult = await hook.afterToolCall(ctx, currentResult);
    }
    return currentResult;
  }

  async runOnError(error: Error): Promise<void> {
    for (const hook of this.hooks) {
      if (!hook.onError) continue;
      await hook.onError(error);
    }
  }
}
