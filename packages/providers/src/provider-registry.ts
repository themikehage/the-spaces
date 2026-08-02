import type { IModelProvider } from "@spaces/core";

export class ProviderRegistry {
  private readonly providers = new Map<string, IModelProvider>();

  register(provider: IModelProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): IModelProvider | undefined {
    return this.providers.get(name);
  }

  getOrThrow(name: string): IModelProvider {
    const provider = this.get(name);
    if (!provider) {
      throw new Error(`Model provider "${name}" not found in registry`);
    }
    return provider;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  clear(): void {
    this.providers.clear();
  }
}
