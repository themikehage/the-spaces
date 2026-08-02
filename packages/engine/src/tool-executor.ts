import type {
  IHookRunner,
  IPermissionEngine,
  ITool,
  IToolExecutor,
  IToolRegistry,
  LLMToolDefinition,
  ToolCall,
  ToolCallContext,
  ToolContext,
  ToolResult,
} from "@spaces/core";

export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, ITool>();

  register(tool: ITool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  list(filter?: { category?: string }): ITool[] {
    const all = Array.from(this.tools.values());
    if (!filter?.category) return all;
    return all.filter((t) => t.category === filter.category);
  }

  toLLMFormat(): LLMToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => {
      const shape = (t.parameters as any)?._def?.shape?.() ?? (t.parameters as any)?.shape ?? {};
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = {
          type: "string",
          description: (value as any)?.description ?? "",
        };
        if (!(value as any)?.isOptional?.()) {
          required.push(key);
        }
      }

      return {
        name: t.name,
        description: t.description,
        parameters: {
          type: "object",
          properties,
          required,
        },
      };
    });
  }
}

export class ToolExecutor implements IToolExecutor {
  constructor(
    private registry: IToolRegistry = new ToolRegistry(),
    private permissionEngine?: IPermissionEngine,
    private hookRunner?: IHookRunner
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
