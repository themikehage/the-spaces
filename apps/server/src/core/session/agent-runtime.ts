// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { SessionPrefix, type AgentDefinition, type BaseTool } from "shared";
import { createAgentSession, DefaultResourceLoader, type AgentSession } from "..";
import { agentRegistry } from "../../agents";
import { cascadeConfigLoader } from "../config";
import { mcpRegistry } from "../mcp/mcp-registry";
import { memoryRegistry } from "../memory/registry";
import type { AvailableModel } from "../model/model-registry";
import { buildSubagentRules, evaluateSubagentRules } from "../sandbox";
import { createAfterToolCallHook } from "./after-tool-call-hook";
import { createBeforeToolCallHook } from "./before-tool-call-hook";
import { attachSessionMcpTools } from "./mcp-attach";
import { sessionMetadataStore } from "./metadata-store";
import { DefaultModelResolver } from "./model-resolver";
import { sessionPromptBuilder } from "./prompt-builder";
import { enrichSessionWithMemory } from "./session-memory-enricher";
import { resolveActiveTools } from "./tool-activation-engine";
import { sessionToolFactory } from "./tool-factory";
import type { IWorkflowEngine } from "../ports/workflow-engine.port";
import { serverSpacesHost } from "../infra/spaces-host";
import { userConfigManager } from "./user-config";
import {
  getResolvedSkillPaths,
  resolveProjectDir,
  resolveSessionWorkspace,
} from "./workspace-resolver";

export type SessionBootstrapProfile = "user-session" | "agent-server" | "subagent" | "delegate";

export interface AgentRuntimeConfig {
  username: string;
  sessionId: string;
  projectId?: string;
  agentId?: string;
  teamId?: string;
  parentSessionId?: string;
  subagentType?: string;
  workspaceDir?: string;
  agentDef?: AgentDefinition;
  profile?: SessionBootstrapProfile;
  toolProfile?: "user-session" | "agent-server" | "subagent";
  toolOverrides?: {
    add?: string[];
    remove?: string[];
  };
  skipMemory?: boolean;
  skipMcpTools?: boolean;
  resourceLoader?: DefaultResourceLoader;
  customTools?: BaseTool[];
  workflowEngine?: IWorkflowEngine;
}

export interface AgentRuntimeInstance {
  session: AgentSession;
  workspaceDir: string;
  sessionDir: string;
  model: AvailableModel | null;
  memory: any;
  runtime: AgentRuntimeInstance;
  context: {
    workspaceDir: string;
    sessionDir: string;
    memoryEnabled: boolean;
    memoryDbPath: string;
  };
}

export async function createAgentRuntime(
  config: AgentRuntimeConfig,
): Promise<AgentRuntimeInstance> {
  const {
    username,
    sessionId,
    projectId,
    agentId,
    teamId,
    parentSessionId,
    subagentType,
    workspaceDir: customWorkspaceDir,
    skipMemory = false,
    skipMcpTools = false,
    profile = sessionId.startsWith(SessionPrefix.SUBAGENT) ||
    sessionId.startsWith(SessionPrefix.DELEGATE)
      ? "subagent"
      : "user-session",
    toolProfile = profile === "agent-server"
      ? "agent-server"
      : profile === "subagent" || profile === "delegate"
        ? "subagent"
        : "user-session",
    toolOverrides,
  } = config;

  let agentDef = config.agentDef;
  if (!agentDef && agentId) {
    const agentEntry = agentRegistry.get(agentId);
    agentDef = agentEntry?.server.definition;
  }

  // TODO(eslint): reconsider the prefer-const suppression after refactoring
  // eslint-disable-next-line prefer-const
  let { sessionDir, workspaceDir } = resolveSessionWorkspace(
    username,
    sessionId,
    projectId,
    agentId,
    teamId,
  );

  if (customWorkspaceDir) {
    workspaceDir = customWorkspaceDir;
  }

  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }
  if (!existsSync(workspaceDir)) {
    mkdirSync(workspaceDir, { recursive: true });
  }

  let projectDir: string | null = null;
  let resolvedProjectId = projectId;

  if (resolvedProjectId) {
    projectDir = resolveProjectDir(username, resolvedProjectId);
    if (projectDir) {
      const projectJsonPath = join(projectDir, "project.json");
      if (existsSync(projectJsonPath)) {
        try {
          const meta = JSON.parse(readFileSync(projectJsonPath, "utf-8"));
          if (meta.id) resolvedProjectId = meta.id;
        } catch (e) {
          console.error("[createAgentRuntime] Failed to read project.json:", e);
        }
      }
    }
  }

  const entityConfig = await cascadeConfigLoader.load(username, {
    agentId,
    projectId: resolvedProjectId,
    teamId,
  });

  const metadata = sessionMetadataStore.getSessionMetadata(username, sessionId);

  if (entityConfig.autonomyLevel && (!metadata || !metadata.autonomyLevel)) {
    sessionMetadataStore.setAutonomyLevel(username, sessionId, entityConfig.autonomyLevel);
  }
  if (entityConfig.executionMode && (!metadata || !metadata.executionMode)) {
    sessionMetadataStore.setExecutionMode(username, sessionId, entityConfig.executionMode as any);
  }
  const skillPaths = getResolvedSkillPaths(workspaceDir, username);
  const metadataSkills: string[] =
    metadata && Array.isArray(metadata.skills) ? metadata.skills : [];
  const entityConfigSkills: string[] = entityConfig.skills || [];
  const combinedSkills = Array.from(new Set([...metadataSkills, ...entityConfigSkills]));

  if (combinedSkills.length > 0) {
    for (const sk of combinedSkills) {
      const candidates = [
        sk,
        resolve(workspaceDir, ".spaces", "skills", sk),
        resolve(workspaceDir, ".pi", "skills", sk),
        resolve(workspaceDir, ".agents", "skills", sk),
      ];
      for (const candidate of candidates) {
        const resolvedCandidate = resolve(candidate);
        if (existsSync(resolvedCandidate) && !skillPaths.includes(resolvedCandidate)) {
          skillPaths.push(resolvedCandidate);
        }
      }
    }
  }

  const mcpConfig = mcpRegistry.loadConfig(username);
  const cachedMcpToolNames: string[] = [];
  for (const srv of Object.values(mcpConfig.mcpServers)) {
    if (srv.enabled && Array.isArray(srv.tools)) {
      for (const tName of srv.tools) {
        cachedMcpToolNames.push(`mcp_${srv.id}_${tName}`);
      }
    }
  }

  const userSettings = userConfigManager.getUserSettings(username);
  const memoryEnabled = skipMemory ? false : (userSettings.memoryEnabled ?? true);
  const memoryDbPath = join(sessionDir, "memory", "memory.db");

  const memoryKey =
    profile === "agent-server" ? `agent:${agentId || sessionId}` : `session:${sessionId}`;

  const memory = await memoryRegistry.get(memoryKey, memoryDbPath, memoryEnabled);

  const { authStorage, modelRegistry } = userConfigManager.getUserContext(username);
  modelRegistry.refresh();

  const modelResolver = new DefaultModelResolver(modelRegistry);
  const resolvedModel = modelResolver.resolve({
    userDefaultModel: userConfigManager.getUserDefaultModel(username) ?? undefined,
    workspaceConfigModel: entityConfig.defaultModel,
  });

  let resourceLoader = config.resourceLoader;
  if (!resourceLoader) {
    const appendPrompts = await sessionPromptBuilder.buildSystemPrompts({
      username,
      sessionId,
      workspaceDir,
      sessionDir,
      resolvedAgentId: agentId,
      agentDef: agentDef
        ? { name: agentDef.name, systemPrompt: agentDef.systemPrompt || "" }
        : undefined,
      cachedMcpToolNames,
      projectId: resolvedProjectId,
      entityConfig,
    });

    resourceLoader = new DefaultResourceLoader({
      cwd: workspaceDir,
      agentDir: sessionDir,
      additionalSkillPaths: skillPaths,
      appendSystemPrompt: appendPrompts,
    });
    await resourceLoader.reload();
  }

  const { customTools: factoryCustomTools, hasExaKey } = sessionToolFactory.createSessionTools({
    username,
    sessionId,
    workspaceDir,
    memoryEnabled,
    memory,
    modelRegistry,
    authStorage,
    resourceLoader,
    contextAgentId: agentId,
    teamId,
    projectId: resolvedProjectId,
    agentDirectory: serverSpacesHost.agents,
    workflowEngine: config.workflowEngine ?? serverSpacesHost.workflows,
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
    permissionOverrides: entityConfig.permissionOverrides,
  });

  const afterToolCall = createAfterToolCallHook({
    sessionId,
    username,
  });

  const { JsonlSessionStore } = await import("..");
  const sessionStore = JsonlSessionStore.create(sessionDir, sessionDir);

  const { session } = await createAgentSession({
    cwd: workspaceDir,
    sessionStore,
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

  const isSubagent =
    profile === "subagent" ||
    profile === "delegate" ||
    sessionId.startsWith(SessionPrefix.SUBAGENT) ||
    sessionId.startsWith(SessionPrefix.DELEGATE);

  let existingParentId = parentSessionId;
  let existingSubagentType = subagentType;

  if (isSubagent && (!existingParentId || !existingSubagentType)) {
    const metadataPath = join(sessionDir, "metadata.json");
    if (existsSync(metadataPath)) {
      try {
        const meta = JSON.parse(readFileSync(metadataPath, "utf-8"));
        if (!existingParentId) existingParentId = meta.parentSessionId;
        if (!existingSubagentType) existingSubagentType = meta.subagentType;
      } catch {
        /* noop */
      }
    }
  }

  const systemTools = sessionMetadataStore.getSessionTools(username, sessionId);
  const mergedToolOverrides = {
    add: [...(entityConfig?.toolOverrides?.add || []), ...(toolOverrides?.add || [])],
    remove: [...(entityConfig?.toolOverrides?.remove || []), ...(toolOverrides?.remove || [])],
  };

  const combinedTools = resolveActiveTools({
    sessionTools: systemTools,
    hasExaKey,
    memoryEnabled,
    resolvedAgentId: agentId,
    toolOverrides: mergedToolOverrides,
  });

  let activeToolsList = combinedTools;
  if (isSubagent) {
    const effectiveRules = buildSubagentRules(
      username,
      sessionId,
      existingParentId,
      existingSubagentType,
    );
    activeToolsList = combinedTools.filter((toolName) => {
      const verdict = evaluateSubagentRules(toolName, {}, effectiveRules);
      return !(verdict && verdict.allow === false);
    });
  }

  session.setActiveToolsByName(activeToolsList);

  if (!skipMemory) {
    enrichSessionWithMemory(session, memory);
  }

  if (!skipMcpTools) {
    const mcpKey = profile === "agent-server" ? agentId || sessionId : sessionId;
    await attachSessionMcpTools(session, username, mcpKey);
  }

  const instance: AgentRuntimeInstance = {
    session,
    workspaceDir,
    sessionDir,
    model: resolvedModel ?? null,
    memory,
    get runtime() {
      return instance;
    },
    get context() {
      return {
        workspaceDir,
        sessionDir,
        memoryEnabled,
        memoryDbPath,
      };
    },
  };
  return instance;
}

export const bootstrapAgentSession = createAgentRuntime;
