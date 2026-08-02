import type { AgentMessage, MessageDelta, ToolCall, ToolResult } from "./types.js";

export type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: AgentMessage[] }
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AgentMessage; delta: MessageDelta }
  | { type: "message_end"; message: AgentMessage }
  | { type: "tool_execution_start"; toolCall: ToolCall }
  | { type: "tool_execution_end"; toolCall: ToolCall; result: ToolResult }
  | { type: "agent_error"; error: string };
