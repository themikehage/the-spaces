// SPDX-License-Identifier: MIT
import type { IModelProvider } from "../core/ports/model.port";
import type { ModelRegistry } from "./model-registry";

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
}
