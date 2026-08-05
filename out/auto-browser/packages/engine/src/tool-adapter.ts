import type { ITool, ToolContext } from "@auto-browser/core";
import type { AgentTool } from "./vendor/agent/src/types.ts";

export function toVendorAgentTool(tool: ITool, sessionId = "default"): AgentTool<any, any> {
  return {
    name: tool.name,
    description: tool.description,
    label: tool.label,
    parameters: tool.parameters as any,

    async execute(
      toolCallId: string,
      params: unknown,
      signal: AbortSignal | undefined,
      onUpdate: ((partial: any) => void) | undefined,
    ) {
      const ctx: ToolContext = {
        sessionId,
        toolCallId,
        signal,
        onUpdate: onUpdate
          ? (partial) =>
              onUpdate({
                content: partial.content,
                details: partial.details,
              })
          : undefined,
      };

      const result = await tool.execute(toolCallId, params as never, ctx);

      return {
        content: result.content as any,
        details: result.details,
        terminate: result.terminate,
      };
    },
  };
}
