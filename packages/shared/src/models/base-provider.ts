// SPDX-License-Identifier: MIT

export interface ProviderCapabilities {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  structuredOutput: boolean;
  maxContextWindow?: number;
}

export interface ProviderModelInfo {
  id: string;
  name: string;
  reasoning?: boolean;
  input?: string[];
  contextWindow?: number;
  maxTokens?: number;
  cost?: { input: number; output: number };
}

export interface BaseLlmProvider {
  readonly id: string;
  readonly name: string;
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly capabilities: ProviderCapabilities;
  matchModel(modelId: string): boolean;
  listModels(): ProviderModelInfo[];
}
