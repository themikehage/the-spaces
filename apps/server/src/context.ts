// SPDX-License-Identifier: MIT
import type { IAgentRuntime, IModelProvider, ISandbox, ISessionStore, IToolRegistry } from "@spaces/core";
import { createAgent } from "@spaces/engine";
import { OpenAICompatibleProvider } from "@spaces/providers";
import { LocalSandbox } from "@spaces/sandbox";
import { FilesystemSessionStore } from "@spaces/storage";
import { createDefaultToolRegistry } from "@spaces/tools";
import { loadEngineConfig } from "./config/engine-config";

export interface AppContext {
  sessionStore: ISessionStore;
  modelProvider: IModelProvider;
  toolRegistry: IToolRegistry;
  sandbox: ISandbox;
  agentCache: Map<string, IAgentRuntime>;
  createSessionAgent(sessionId: string): IAgentRuntime;
}

export async function createAppContext(): Promise<AppContext> {
  const config = loadEngineConfig();

  const sessionStore = new FilesystemSessionStore(config.sessionsDir);
  const modelProvider = new OpenAICompatibleProvider({
    baseUrl: config.modelBaseUrl,
    apiKey: config.modelApiKey,
    model: config.modelName,
  });
  const toolRegistry = createDefaultToolRegistry();
  const sandbox = new LocalSandbox();
  const agentCache = new Map<string, IAgentRuntime>();

  const createSessionAgent = (sessionId: string): IAgentRuntime => {
    let agent = agentCache.get(sessionId);
    if (!agent) {
      agent = createAgent(sessionId, {
        modelProvider,
        sessionStore,
      });
      agentCache.set(sessionId, agent);
    }
    return agent;
  };

  return {
    sessionStore,
    modelProvider,
    toolRegistry,
    sandbox,
    agentCache,
    createSessionAgent,
  };
}
