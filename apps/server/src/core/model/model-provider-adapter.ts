// SPDX-License-Identifier: MIT
import type {
  IModelProvider,
  StreamCompleteOptions,
  StreamCompleteResult,
} from "../ports/model.port";
import { OpenAICompatibleProvider, type FetchFunction } from "../providers/openai-compatible";
import type { AvailableModel, ModelRegistry } from "./model-registry";

export class ModelProviderAdapter implements IModelProvider {
  constructor(
    private modelRegistry: ModelRegistry,
    private fetchFn?: FetchFunction,
  ) {}

  private resolveTargetModel(modelId?: string): AvailableModel | undefined {
    const available = this.modelRegistry.getAvailable() ?? [];
    if (modelId) {
      const match = available.find(
        (m) => m.id === modelId || `${m.provider}/${m.id}` === modelId,
      );
      if (match) return match;
    }
    return available[0];
  }

  createModel(modelId?: string): unknown {
    return this.resolveTargetModel(modelId);
  }

  async getApiKey(provider?: string): Promise<string | undefined> {
    const available = this.modelRegistry.getAvailable() ?? [];
    const target = provider
      ? available.find((m) => m.provider === provider)
      : this.resolveTargetModel();
    if (!target) return undefined;
    const result = await this.modelRegistry.getApiKeyAndHeaders(target);
    return result.ok ? result.apiKey : undefined;
  }

  async streamComplete(opts: StreamCompleteOptions): Promise<StreamCompleteResult> {
    const target = this.resolveTargetModel(opts.modelId);
    let apiKey = opts.apiKey;
    let baseUrl = opts.baseUrl;
    let modelId = opts.modelId;

    if (target) {
      if (!apiKey) {
        const keyResult = await this.modelRegistry.getApiKeyAndHeaders(target);
        if (keyResult.ok) {
          apiKey = keyResult.apiKey;
        }
      }
      if (!baseUrl) {
        baseUrl = target.baseUrl;
      }
      if (!modelId) {
        modelId = target.id;
      } else if (modelId === `${target.provider}/${target.id}`) {
        modelId = target.id;
      }
    }

    const provider = new OpenAICompatibleProvider({
      apiKey,
      baseUrl,
      defaultModelId: modelId,
      fetchFn: this.fetchFn,
    });
    return provider.streamComplete({ ...opts, apiKey, baseUrl, modelId });
  }
}