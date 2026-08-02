import type { LLMMessage, MessageDelta } from "../types";
import type { LLMToolDefinition } from "./tool.port";

export interface StreamCompleteOptions {
  messages: LLMMessage[];
  tools: LLMToolDefinition[];
  system: string;
  signal: AbortSignal;
  onDelta: (delta: MessageDelta) => void;
}

export interface IModelProvider {
  readonly name: string;
  streamComplete(opts: StreamCompleteOptions): Promise<void>;
}
