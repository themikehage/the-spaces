import type {
  IHookRunner,
  IPermissionEngine,
  IToolExecutor,
  IToolRegistry,
  ToolCall,
  ToolCallContext,
  ToolContext,
  ToolResult,
} from "@spaces/core";

export class ToolExecutor implements IToolExecutor {
  constructor(
    private registry: IToolRegistry,
    private permissionEngine?: IPermissionEngine,
    private hookRunner?: IHookRunner,
  ) {}

  getRegistry(): IToolRegistry {
    return this.registry;
  }

  async execute(toolCall: ToolCall, ctx: ToolContext): Promise<ToolResult> {
    const tool = this.registry.get(toolCall.name);
    if (!tool) {
      return {
        toolCallId: toolCall.id,
        output: `Error: Tool '${toolCall.name}' not found`,
        isError: true,
      };
    }

    if (this.permissionEngine) {
      const permResult = await this.permissionEngine.evaluate({
        toolCall,
        sessionId: ctx.sessionId,
      });
      if (!permResult.allowed) {
        return {
          toolCallId: toolCall.id,
          output: `Error: Tool execution denied. ${permResult.reason ?? "Permission blocked"}`,
          isError: true,
        };
      }
    }

    let callContext: ToolCallContext = {
      toolCall,
      sessionId: ctx.sessionId,
    };

    if (this.hookRunner) {
      const beforeResult = await this.hookRunner.runBeforeToolCall(callContext);
      if (beforeResult === null) {
        return {
          toolCallId: toolCall.id,
          output: `Error: Tool call '${toolCall.name}' blocked by hook`,
          isError: true,
        };
      }
      callContext = beforeResult;
    }

    let rawResult: ToolResult;
    try {
      const parsedArgs = tool.parameters.parse(callContext.toolCall.arguments);
      rawResult = await tool.execute(parsedArgs, ctx);
    } catch (err) {
      rawResult = {
        toolCallId: toolCall.id,
        output: err instanceof Error ? err.message : String(err),
        isError: true,
      };
    }

    if (this.hookRunner) {
      return this.hookRunner.runAfterToolCall(callContext, rawResult);
    }

    return rawResult;
  }
}
