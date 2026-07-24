// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync } from "node:fs";
import { type AgentDefinition, type BaseTool } from "shared";
import { createAgentSession, DefaultResourceLoader } from "../../ai";
import { resolveAgentContext, type ResolvedAgentContext } from "./agent-context-resolver";
import { DefaultModelResolver } from "./model-resolver";
import { sessionPromptBuilder } from "./prompt-builder";
import { sessionToolFactory } from "./tool-factory";
import { userConfigManager } from "./user-config";
import { memoryRegistry } from "../memory/registry";
import { createBeforeToolCallHook } from "./before-tool-call-hook";
import { createAfterToolCallHook } from "./after-tool-call-hook";
import { resolveAgentDefinition } from "./agent-definition-resolver";

export interface AgentRuntimeConfig {
  username: string;
  sessionId: string;
  projectId?: string;
  agentId?: string;
  teamId?: string;
  workspaceDir?: string;
  agentDef?: AgentDefinition;
  toolProfile?: "user-session" | "agent-server" | "subagent";
  toolOverrides?: {
    add?: string[];
    remove?: string[];
  };
  skipMemory?: boolean;
  resourceLoader?: DefaultResourceLoader;
  customTools?: BaseTool[];
}

export interface AgentRuntimeInstance {
  session: any;
  workspaceDir: string;
  sessionDir: string;
  model: any;
  context: ResolvedAgentContext;
}

export async function createAgentRuntime(config: AgentRuntimeConfig): Promise<AgentRuntimeInstance> {
  const {
    username,
    sessionId,
    projectId,
    agentId,
    teamId,
    workspaceDir: customWorkspaceDir,
    skipMemory,
    toolProfile = "user-session",
    toolOverrides,
  } = config;

  let agentDef = config.agentDef;
  if (!agentDef && agentId) {
    const resolved = await resolveAgentDefinition({
      username,
      resolvedAgentId: agentId,
      getDefaultModel: () => userConfigManager.getUserDefaultModel(username),
    });
    agentDef = resolved.agentDef;
  }

  const context = resolveAgentContext({
    username,
    sessionId,
    projectId,
    agentId,
    teamId,
    customWorkspaceDir,
    agentSkills: agentDef?.skills || [],
    skipMemory,
  });

  if (!existsSync(context.sessionDir)) {
    mkdirSync(context.sessionDir, { recursive: true });
  }
  if (!existsSync(context.workspaceDir)) {
    mkdirSync(context.workspaceDir, { recursive: true });
  }

  const { authStorage, modelRegistry } = userConfigManager.getUserContext(username);
  modelRegistry.refresh();

  const modelResolver = new DefaultModelResolver(modelRegistry);
  const resolvedModel = modelResolver.resolve({
    agentModel: agentDef?.model,
    userDefaultModel: userConfigManager.getUserDefaultModel(username) ?? undefined,
  });

  const memory = await memoryRegistry.get(
    toolProfile === "agent-server" ? `agent:${agentId}` : `session:${sessionId}`,
    context.memoryDbPath,
    context.memoryEnabled
  );

  let resourceLoader = config.resourceLoader;
  if (!resourceLoader) {
    const appendPrompts = await sessionPromptBuilder.buildSystemPrompts({
      username,
      sessionId,
      workspaceDir: context.workspaceDir,
      sessionDir: context.sessionDir,
      resolvedAgentId: agentId,
      agentDef,
      cachedMcpToolNames: context.cachedMcpToolNames,
      projectId: context.projectId,
    });

    resourceLoader = new DefaultResourceLoader({
      cwd: context.workspaceDir,
      agentDir: context.sessionDir,
      additionalSkillPaths: context.skillPaths,
      appendSystemPrompt: appendPrompts,
    });
    await resourceLoader.reload();
  }

  const { customTools: factoryCustomTools, hasExaKey } = sessionToolFactory.createSessionTools({
    username,
    sessionId,
    workspaceDir: context.workspaceDir,
    memoryEnabled: context.memoryEnabled,
    memory,
    modelRegistry,
    authStorage,
    resourceLoader,
    contextAgentId: agentId,
    teamId,
    projectId: context.projectId,
  });

  let finalCustomTools = factoryCustomTools;
  if (config.customTools && config.customTools.length > 0) {
    const overrideNames = new Set(config.customTools.map((t: any) => t.name));
    finalCustomTools = [
      ...config.customTools,
      ...factoryCustomTools.filter((t: any) => !overrideNames.has(t.name)),
    ];
  }

  const beforeToolCall = createBeforeToolCallHook({
    sessionId,
    isSubagent: toolProfile === "subagent" || toolProfile === "agent-server",
    username,
  });

  const afterToolCall = createAfterToolCallHook({
    sessionId,
    username,
  });

  const { PluginManager } = await import("shared");
  const { AuditLogPlugin, MemoryEnricherPlugin } = await import("../plugins");
  const pluginManager = new PluginManager();
  pluginManager.register(new AuditLogPlugin({ sessionId, username }));
  pluginManager.register(new MemoryEnricherPlugin({ memory }));

  const { sessionManager: sessionStore } = await import("../../ai");
  const sessionManagerInstance = sessionStore.create(context.sessionDir, context.sessionDir);

  const { session } = await createAgentSession({
    cwd: context.workspaceDir,
    sessionManager: sessionManagerInstance,
    authStorage,
    modelRegistry,
    resourceLoader,
    customTools: finalCustomTools.map((t) => (t.toVendorFormat ? t.toVendorFormat() : t)),
    beforeToolCall,
    afterToolCall,
  });

  if (resolvedModel) {
    try {
      await session.setModel(resolvedModel);
    } catch (e) {
      console.error(`[AgentRuntime] Failed to set resolved model for session ${sessionId}:`, e);
    }
  }

  return {
    session,
    workspaceDir: context.workspaceDir,
    sessionDir: context.sessionDir,
    model: resolvedModel,
    context,
  };
}
