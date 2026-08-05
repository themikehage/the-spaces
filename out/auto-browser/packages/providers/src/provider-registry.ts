import type { IModelProvider } from "@auto-browser/core";

export class ProviderRegistry {
  private providers = new Map<string, IModelProvider>();

  register(provider: IModelProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): IModelProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`No model provider registered for "${name}"`);
    }
    return provider;
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  list(): IModelProvider[] {
    return Array.from(this.providers.values());
  }
}
