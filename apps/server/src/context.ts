// SPDX-License-Identifier: MIT
import type { IAgentRuntime, IModelProvider, ISandbox, ISessionStore, IToolRegistry } from "@spaces/core";
import { createAgent } from "@spaces/engine";
import { OpenAICompatibleProvider } from "@spaces/providers";
import { LocalSandbox } from "@spaces/sandbox";
import { FilesystemSessionStore } from "@spaces/storage";
import { createDefaultToolRegistry, McpRegistry } from "@spaces/tools";
import { loadEngineConfig } from "./config/engine-config";

export interface AppContext {
  sessionStore: ISessionStore;
  modelProvider: IModelProvider;
  toolRegistry: IToolRegistry;
  sandbox: ISandbox;
  mcpRegistry: McpRegistry;
  agentCache: Map<string, IAgentRuntime>;
  createSessionAgent(sessionId: string): IAgentRuntime;
  dispose(): Promise<void>;
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
  const mcpRegistry = new McpRegistry();
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

  const dispose = async (): Promise<void> => {
    for (const [, agent] of agentCache) {
      await agent.dispose().catch(() => {});
    }
    agentCache.clear();
  };

  return {
    sessionStore,
    modelProvider,
    toolRegistry,
    sandbox,
    mcpRegistry,
    agentCache,
    createSessionAgent,
    dispose,
  };
}

