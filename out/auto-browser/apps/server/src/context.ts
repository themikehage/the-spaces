import {
  type IAgentRuntime,
  type ISessionStore,
  type IToolRegistry,
  DEFAULT_PRESET_PROVIDERS,
} from "@auto-browser/core";
import type { ServerConfig } from "./config.ts";
import { OpenAICompatibleProvider } from "@auto-browser/providers";
import { FilesystemSessionStore, FilesystemProviderStore } from "@auto-browser/storage";
import { ToolRegistry, ToolExecutor } from "@auto-browser/engine";
import { registerDefaultTools } from "@auto-browser/tools";

export interface AppContext {
  config: ServerConfig;
  modelProvider: OpenAICompatibleProvider;
  sessionStore: ISessionStore;
  providerStore: FilesystemProviderStore;
  toolRegistry: IToolRegistry;
  agents: Map<string, IAgentRuntime>;
}

export function createAppContext(config: ServerConfig): AppContext {
  const sessionStore = new FilesystemSessionStore(config.SESSIONS_DIR);
  const providerStore = new FilesystemProviderStore(config.SESSIONS_DIR);

  const defaultPreset = providerStore.getDefaultSync(true) ?? DEFAULT_PRESET_PROVIDERS[0]!;
  const modelProvider = new OpenAICompatibleProvider({
    apiKey: defaultPreset.apiKey || "",
    baseUrl: defaultPreset.baseUrl,
    modelId: defaultPreset.activeModelId,
    provider: defaultPreset.id,
  });

  const toolRegistry = new ToolRegistry();
  registerDefaultTools(toolRegistry);

  return {
    config,
    modelProvider,
    sessionStore,
    providerStore,
    toolRegistry,
    agents: new Map(),
  };
}
