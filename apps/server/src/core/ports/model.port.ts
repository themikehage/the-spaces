// SPDX-License-Identifier: MIT

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | unknown[];
  name?: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface MessageDelta {
  type: "text_delta" | "tool_call_delta" | "tool_call_done" | "usage" | "reasoning_delta";
  text?: string;
  toolCall?: {
    id?: string;
    index?: number;
    name?: string;
    arguments?: string;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamCompleteOptions {
  messages: LLMMessage[];
  tools?: LLMToolDefinition[];
  system?: string;
  signal?: AbortSignal;
  onDelta?: (delta: MessageDelta) => void;
  modelId?: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamCompleteResult {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface ModelCompletionOptions {
  messages: unknown[];
  tools?: unknown[];
  system?: string;
  signal?: AbortSignal;
}

export interface IModelProvider {
  streamComplete?(opts: StreamCompleteOptions): Promise<StreamCompleteResult>;
  createModel?(modelId?: string): unknown;
  getApiKey?(provider?: string): Promise<string | undefined> | string | undefined;
}
