import type { Hook, ToolCallContext, ToolResult } from "@spaces/core";

export class McpAuditHook implements Hook {
  readonly id = "mcp-audit";
  readonly priority = 50;

  async afterToolCall(ctx: ToolCallContext, result: ToolResult): Promise<ToolResult> {
    if (ctx.toolCall.name.startsWith("mcp_")) {
      console.log(`[MCP Audit] Tool ${ctx.toolCall.name} executed. Error: ${Boolean(result.isError)}`);
    }
    return result;
  }
}
