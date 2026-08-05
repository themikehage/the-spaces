import type { IModelProvider, ModelConfig, AgentMessage } from "@auto-browser/core";

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl?: string;
  modelId: string;
  provider?: string;
}

export class OpenAICompatibleProvider implements IModelProvider {
  readonly name = "openai-compatible";

  private config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<OpenAICompatibleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  createModel(config?: Partial<ModelConfig>): unknown {
    const provider = config?.provider ?? this.config.provider ?? "openai";
    const modelId = config?.modelId ?? this.config.modelId;

    return {
      provider,
      id: modelId,
      api: "openai-completions",
      name: modelId,
      baseUrl: this.config.baseUrl,
      input: ["text", "image"],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
      },
    };
  }

  stream(_model: unknown, _messages: AgentMessage[], _opts: any): AsyncIterable<any> {
    throw new Error(
      "OpenAICompatibleProvider.stream() should not be called directly. Use AgentRuntime which delegates to the vendor loop.",
    );
  }

  getApiKey(): string {
    return this.config.apiKey;
  }

  getBaseUrl(): string | undefined {
    return this.config.baseUrl;
  }

  getModelId(): string {
    return this.config.modelId;
  }
}
