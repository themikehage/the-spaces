// SPDX-License-Identifier: MIT
import type { IHookRunner } from "./ports/hook.port";
import type { IPermissionEngine } from "./ports/permission.port";
import type { IToolExecutor, ToolCallExecution } from "./ports/tool-executor.port";
import type { IToolRegistry, ToolContext } from "./ports/tool.port";

export class ToolExecutor implements IToolExecutor {
  constructor(
    private registry: IToolRegistry,
    private hookRunner?: IHookRunner,
    private permissionEngine?: IPermissionEngine,
  ) {}

  getRegistry(): IToolRegistry {
    return this.registry;
  }

  async execute(call: ToolCallExecution, ctx?: ToolContext): Promise<any> {
    const tool = this.registry.get(call.toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${call.toolName}`);
    }

    if (this.permissionEngine) {
      const evalResult = await this.permissionEngine.evaluate({
        sessionId: ctx?.sessionId,
        toolName: call.toolName,
        args: call.args,
      });
      if (!evalResult.allowed) {
        throw new Error(`Tool execution blocked: ${evalResult.reason ?? "Denied by permission engine"}`);
      }
    }

    if (this.hookRunner) {
      const beforeResult = await this.hookRunner.runBeforeToolCall(
        {
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          args: call.args,
          context: ctx,
        },
        ctx?.signal,
      );
      if (beforeResult?.block) {
        throw new Error(`Tool execution blocked by hook: ${beforeResult.reason ?? "Blocked by hook"}`);
      }
    }

    let result = await tool.execute(call.toolCallId, call.args, ctx);

    if (this.hookRunner) {
      const afterResult = await this.hookRunner.runAfterToolCall(
        {
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          args: call.args,
          result,
          context: ctx,
        },
        ctx?.signal,
      );
      if (afterResult?.content !== undefined) {
        result = afterResult.content;
      }
    }

    return result;
  }
}
