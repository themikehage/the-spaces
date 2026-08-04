// SPDX-License-Identifier: MIT
import type { AgentTool } from "../ai/vendor/agent/src/types";
import type { ITool } from "./ports/tool.port";

export function iToolToAgentTool(tool: ITool, sessionId: string = ""): AgentTool {
  return {
    name: tool.name,
    label: tool.label || tool.name,
    description: tool.description,
    parameters: (tool.parameters || {}) as any,
    execute: (toolCallId, params, signal, onUpdate) =>
      tool.execute(toolCallId, params, {
        sessionId,
        toolCallId,
        signal,
        onUpdate: onUpdate ? (partial: any) => onUpdate(partial) : undefined,
      }),
  };
}
