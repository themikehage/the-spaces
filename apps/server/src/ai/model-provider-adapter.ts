// SPDX-License-Identifier: MIT
import type {
  IModelProvider,
  StreamCompleteOptions,
  StreamCompleteResult,
} from "../core/ports/model.port";
import type { ModelRegistry } from "./model-registry";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";

export class ModelProviderAdapter implements IModelProvider {
  constructor(private modelRegistry: ModelRegistry) {}

  createModel(modelId?: string): unknown {
    const available = this.modelRegistry.getAvailable();
    if (modelId) {
      return available.find((m) => m.id === modelId) ?? available[0];
    }
    return available[0];
  }

  async getApiKey(provider?: string): Promise<string | undefined> {
    const available = this.modelRegistry.getAvailable();
    const target = available.find((m) => m.provider === (provider ?? "openai")) ?? available[0];
    if (!target) return undefined;
    const result = await this.modelRegistry.getApiKeyAndHeaders(target);
    return result.ok ? result.apiKey : undefined;
  }

  async streamComplete(opts: StreamCompleteOptions): Promise<StreamCompleteResult> {
    const apiKey = opts.apiKey ?? (await this.getApiKey());
    const provider = new OpenAICompatibleProvider({
      apiKey,
      baseUrl: opts.baseUrl,
      defaultModelId: opts.modelId,
    });
    return provider.streamComplete(opts);
  }
}
