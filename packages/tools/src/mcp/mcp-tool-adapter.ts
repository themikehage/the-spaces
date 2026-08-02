import type { ITool, ToolContext, ToolResult } from "@spaces/core";
import { z, type ZodSchema } from "zod";

export interface IMcpClientLike {
  callTool(
    name: string,
    args: unknown,
  ): Promise<{
    content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
    isError?: boolean;
  }>;
}

export class McpToolAdapter implements ITool {
  readonly name: string;
  readonly description: string;
  readonly parameters: ZodSchema;
  readonly category = "MCP";

  constructor(
    private client: IMcpClientLike,
    serverName: string,
    toolDef: { name: string; description?: string; inputSchema?: unknown },
  ) {
    this.name = `mcp_${serverName}_${toolDef.name}`;
    this.description = toolDef.description || `MCP Tool ${toolDef.name} from ${serverName}`;
    this.parameters = z.record(z.string(), z.unknown());
  }

  async execute(args: unknown, _ctx: ToolContext): Promise<ToolResult> {
    try {
      const realToolName = this.name.split("_").slice(2).join("_");
      const res = await this.client.callTool(realToolName, args);
      if (res.isError) {
        const errText = res.content?.[0]?.text || JSON.stringify(res);
        return { toolCallId: "", output: "", isError: true };
      }
      const outputText =
        res.content?.map((c) => c.text || JSON.stringify(c)).join("\n") || "Success";
      return { toolCallId: "", output: outputText, isError: false };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { toolCallId: "", output: "", isError: true };
    }
  }
}
