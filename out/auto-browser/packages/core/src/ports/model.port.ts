import type { AgentMessage, AssistantMessage, ContentBlock } from "../types.ts";
import type { TSchema } from "typebox";

export interface ModelConfig {
  provider: string;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
  api?: string;
}

export interface StreamDelta {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface IModelProvider {
  readonly name: string;

  createModel(config?: Partial<ModelConfig>): unknown;

  getApiKey?(): string;

  stream(model: unknown, messages: AgentMessage[], opts: StreamOptions): AsyncIterable<StreamEvent>;
}

export interface StreamOptions {
  systemPrompt: string;
  tools?: LLMToolDef[];
  apiKey?: string;
  signal?: AbortSignal;
}

export interface LLMToolDef {
  name: string;
  description: string;
  label: string;
  parameters: TSchema;
}

export type StreamEvent =
  | { type: "message_start"; message: AssistantMessage }
  | { type: "message_update"; delta: StreamDelta; message: AssistantMessage }
  | { type: "message_end"; message: AssistantMessage }
  | { type: "error"; error: string };
