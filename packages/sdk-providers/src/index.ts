export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  models: string[];
}

export interface ProviderAdapter {
  id: string;
  name: string;
  getModels(): string[];
  isConfigured(): boolean;
}

export class ProviderRegistry {
  private providers = new Map<string, ProviderAdapter>();

  public register(provider: ProviderAdapter): void {
    this.providers.set(provider.id, provider);
  }

  public get(id: string): ProviderAdapter | undefined {
    return this.providers.get(id);
  }

  public list(): ProviderAdapter[] {
    return Array.from(this.providers.values());
  }
}
