export type MessageRole = "user" | "assistant" | "tool" | "system";

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  output: string;
  isError?: boolean;
}

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  toolUse?: ToolCall;
  toolResult?: ToolResult;
}

export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string | ContentBlock[];
  createdAt: string;
}

export interface LLMMessage {
  role: MessageRole;
  content: string | ContentBlock[];
  tool_call_id?: string;
}

export interface MessageDelta {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  toolCall?: Partial<ToolCall>;
}

export interface ContextUsage {
  used: number;
  total: number;
  percentage: number;
}

// Execution contexts
export interface AgentContext {
  sessionId: string;
  messages: AgentMessage[];
  metadata?: Record<string, unknown>;
}

export interface ToolContext {
  sessionId: string;
  agentId: string;
  workspaceRoot?: string;
}

export interface ToolCallContext {
  toolCall: ToolCall;
  sessionId: string;
}

export interface PromptContext extends AgentContext {
  systemPromptParts?: string[];
}

export interface RuleContext {
  toolCall: ToolCall;
  sessionId: string;
}

export interface AgentError extends Error {
  readonly code: string;
}
