// SPDX-License-Identifier: MIT
import { type BaseLlmProvider } from "./base-provider";

export class LLMRegistry {
  private providers = new Map<string, { provider: BaseLlmProvider; patterns: RegExp[] }>();

  register(provider: BaseLlmProvider, patterns: RegExp[] = []): void {
    this.providers.set(provider.id, { provider, patterns });
  }

  resolve(modelId: string): BaseLlmProvider | undefined {
    for (const { provider, patterns } of this.providers.values()) {
      if (provider.matchModel(modelId)) {
        return provider;
      }
      for (const pattern of patterns) {
        if (pattern.test(modelId)) {
          return provider;
        }
      }
    }
    return undefined;
  }

  get(providerId: string): BaseLlmProvider | undefined {
    return this.providers.get(providerId)?.provider;
  }

  list(): BaseLlmProvider[] {
    return Array.from(this.providers.values()).map((p) => p.provider);
  }
}
