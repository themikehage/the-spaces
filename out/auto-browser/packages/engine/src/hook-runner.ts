import type { Hook, IHookRunner, ToolCallContext, ToolResult } from "@auto-browser/core";

export class HookRunner implements IHookRunner {
  private hooks: Hook[] = [];

  register(hook: Hook): void {
    this.hooks.push(hook);
    this.hooks.sort((a, b) => a.priority - b.priority);
  }

  async runBeforeToolCall(ctx: ToolCallContext): Promise<ToolCallContext | null> {
    let current = ctx;
    for (const hook of this.hooks) {
      if (!hook.beforeToolCall) continue;
      const result = await hook.beforeToolCall(current);
      if (result === null) return null;
      current = result;
    }
    return current;
  }

  async runAfterToolCall(ctx: ToolCallContext, result: ToolResult): Promise<ToolResult> {
    let current = result;
    for (const hook of this.hooks) {
      if (!hook.afterToolCall) continue;
      current = await hook.afterToolCall(ctx, current);
    }
    return current;
  }

  async runOnError(error: Error): Promise<void> {
    for (const hook of this.hooks) {
      if (!hook.onError) continue;
      await hook.onError(error);
    }
  }
}
