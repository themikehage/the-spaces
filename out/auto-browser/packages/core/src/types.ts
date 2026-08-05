import type { TSchema, Static } from "typebox";

export type { TSchema, Static };

export type Role = "user" | "assistant" | "tool" | "system";

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  mediaType: string;
  data: string;
}

export type ContentBlock = TextContent | ImageContent;

export interface ToolCallBlock {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export type AssistantContentBlock = TextContent | ImageContent | ToolCallBlock | ThinkingBlock;

export interface UserMessage {
  role: "user";
  content: ContentBlock[];
  timestamp: number;
}

export interface AssistantMessage {
  role: "assistant";
  content: AssistantContentBlock[];
  stopReason?: "end_turn" | "tool_use" | "max_tokens" | "error" | "aborted" | "stop";
  errorMessage?: string;
  timestamp: number;
}

export interface ToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: ContentBlock[];
  details: unknown;
  isError: boolean;
  timestamp: number;
}

export type AgentMessage = UserMessage | AssistantMessage | ToolResultMessage;

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: TSchema;
}

export interface ToolResult {
  content: ContentBlock[];
  details: unknown;
  terminate?: boolean;
}

export interface AgentContext {
  sessionId: string;
  systemPrompt: string;
  messages: AgentMessage[];
}

export interface ToolContext {
  sessionId: string;
  toolCallId: string;
  signal?: AbortSignal;
  onUpdate?: (partial: ToolResult) => void;
}

export interface PromptContext {
  sessionId: string;
  messages: AgentMessage[];
}

export interface RuleContext {
  sessionId: string;
  toolName: string;
  args: unknown;
}

export interface ContextUsage {
  used: number;
  total: number;
}

export interface PromptOptions {
  signal?: AbortSignal;
}
