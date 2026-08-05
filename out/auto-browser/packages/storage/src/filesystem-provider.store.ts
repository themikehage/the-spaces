import {
  type ProviderConfig,
  type UpsertProviderInput,
  DEFAULT_PRESET_PROVIDERS,
} from "@auto-browser/core";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function maskApiKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (key.length <= 8) return "********";
  return `${key.slice(0, 3)}...${key.slice(-4)}`;
}

export class FilesystemProviderStore {
  private filePath: string;
  private providers = new Map<string, ProviderConfig>();

  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.filePath = join(dir, "providers.json");
    this.load();
  }

  private load(): void {
    if (!existsSync(this.filePath)) {
      for (const preset of DEFAULT_PRESET_PROVIDERS) {
        this.providers.set(preset.id, preset);
      }
      this.save();
      return;
    }

    try {
      const content = readFileSync(this.filePath, "utf-8");
      const list = JSON.parse(content) as ProviderConfig[];
      for (const provider of list) {
        this.providers.set(provider.id, provider);
      }
    } catch {
      for (const preset of DEFAULT_PRESET_PROVIDERS) {
        this.providers.set(preset.id, preset);
      }
    }
  }

  private save(): void {
    const list = Array.from(this.providers.values());
    writeFileSync(this.filePath, JSON.stringify(list, null, 2), "utf-8");
  }

  async list(includeKeys = false): Promise<ProviderConfig[]> {
    const list = Array.from(this.providers.values());
    if (includeKeys) return list;

    return list.map((p) => ({
      ...p,
      apiKey: maskApiKey(p.apiKey),
    }));
  }

  async get(id: string, includeKeys = false): Promise<ProviderConfig | undefined> {
    const provider = this.providers.get(id);
    if (!provider) return undefined;
    if (includeKeys) return provider;

    return {
      ...provider,
      apiKey: maskApiKey(provider.apiKey),
    };
  }

  getDefaultSync(includeKeys = true): ProviderConfig {
    const list = Array.from(this.providers.values());
    const defaultP =
      list.find((p) => p.isDefault && p.enabled) ?? list.find((p) => p.enabled) ?? list[0];

    if (!defaultP) {
      return DEFAULT_PRESET_PROVIDERS[0]!;
    }

    if (includeKeys) return defaultP;
    return { ...defaultP, apiKey: maskApiKey(defaultP.apiKey) };
  }

  async getDefault(includeKeys = true): Promise<ProviderConfig> {
    return this.getDefaultSync(includeKeys);
  }

  async upsert(input: UpsertProviderInput): Promise<ProviderConfig> {
    const id = input.id ?? input.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const existing = this.providers.get(id);

    // If apiKey is masked (e.g., sk-***1234), keep existing full key
    let apiKey = input.apiKey;
    if (apiKey && apiKey.includes("...") && existing?.apiKey) {
      apiKey = existing.apiKey;
    }

    if (input.isDefault) {
      for (const p of this.providers.values()) {
        p.isDefault = false;
      }
    }

    const config: ProviderConfig = {
      id,
      name: input.name,
      type: input.type,
      baseUrl: input.baseUrl || undefined,
      apiKey: apiKey || existing?.apiKey,
      models: input.models,
      activeModelId: input.activeModelId,
      enabled: input.enabled,
      isDefault: input.isDefault,
    };

    this.providers.set(id, config);
    this.save();

    return config;
  }

  async delete(id: string): Promise<void> {
    this.providers.delete(id);
    this.save();
  }
}
