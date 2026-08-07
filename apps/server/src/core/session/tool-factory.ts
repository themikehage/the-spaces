// SPDX-License-Identifier: MIT
import { getTeamWorkspaceDir, legacyToolToBaseTool, type BaseTool } from "shared";
import type { DefaultResourceLoader } from "..";
import {
  createBashToolDefinition,
  createEditToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
} from "..";
import { getOrCreateToolSessionToken } from "../../auth/ephemeral-tool-session";
import { teamStore } from "../../teams/team-store";
import {
  createCustomToolRuntime,
  createManageCustomToolsTool,
  customToolStorage,
} from "../custom-tools";
import { createMemoryTools } from "../memory/memory-tools";
import type { MemoryProvider } from "../memory/types";
import type { ModelRegistry } from "../model/model-registry";
import type { AgentDirectoryPort } from "../ports/spaces-host.port";
import type { IWorkflowEngine } from "../ports/workflow-engine.port";
import { filterSecretsFromOutput } from "../sandbox/bash-output-filter";
import { scopeConfigManager } from "../scope";
import { createAgentDirectoryTools } from "../tools/extensions/agents-directory.tool";
import { createDeepResearchTool } from "../tools/extensions/deep-research";
import { createExaSearchTool } from "../tools/extensions/exa-search.tool";
import { createFactoryTool } from "../tools/extensions/factory.tool";
import { createPreviewTools } from "../tools/extensions/preview.tool";
import { createUiTools } from "../tools/extensions/ui.tool";
import { createWebFetchTool } from "../tools/extensions/web-fetch";
import { createWorkflowTools } from "../tools/extensions/workflow.tool";
import { ModelProviderAdapter } from "../model/model-provider-adapter";
import type { AuthStorage } from "./auth-storage";
import { userConfigManager } from "./user-config";

export interface CreateSessionToolsParams {
  username: string;
  sessionId: string;
  workspaceDir: string;
  memoryEnabled: boolean;
  memory: MemoryProvider | null;
  modelRegistry: ModelRegistry;
  authStorage: AuthStorage;
  resourceLoader: DefaultResourceLoader;
  contextAgentId?: string;
  teamId?: string;
  projectId?: string;
  workflowEngine?: IWorkflowEngine;
  agentDirectory?: AgentDirectoryPort;
}

export class SessionToolFactory {
  createSessionTools(params: CreateSessionToolsParams): {
    customTools: BaseTool[];
    hasExaKey: boolean;
  } {
    const {
      username,
      sessionId,
      workspaceDir,
      memoryEnabled,
      memory,
      modelRegistry,
      authStorage,
      resourceLoader,
      contextAgentId,
    } = params;

    const customBashTool = createBashToolDefinition(workspaceDir, {
      spawnHook: (context) => {
        const userEnv = userConfigManager.getUserEnv(username);
        const injectToken = process.env.SPACES_BASH_INJECT_TOKEN !== "0";
        const token = injectToken ? getOrCreateToolSessionToken(username, sessionId) : undefined;
        return {
          ...context,
          env: {
            ...context.env,
            ...userEnv,
            ...(token ? { TOKEN: token, JWT_TOKEN: token } : {}),
          },
        };
      },
      outputFilter: (output: string) => {
        const userEnv = userConfigManager.getUserEnv(username);
        const secrets = Object.values(userEnv).filter(Boolean);
        const injectToken = process.env.SPACES_BASH_INJECT_TOKEN !== "0";
        if (injectToken) {
          try {
            const token = getOrCreateToolSessionToken(username, sessionId);
            if (token) secrets.push(token);
          } catch {
            /* noop */
          }
        }
        return filterSecretsFromOutput(output, secrets);
      },
    });

    const exaSearchTool = createExaSearchTool({ username });
    const webFetchTool = createWebFetchTool({ username });
    const modelProvider = new ModelProviderAdapter(modelRegistry);
    const deepResearchTool = createDeepResearchTool({ username, modelProvider });
    const memoryTools = memory ? createMemoryTools(memory, memoryEnabled) : [];

    const { teamId, projectId } = params;
    let previewTools: any[] = [];
    if (projectId) {
      try {
        previewTools = createPreviewTools(username, projectId);
      } catch (e) {
        console.error("[SessionToolFactory] Failed to create preview tools:", e);
      }
    }
    let inheritedWorkspaceDir: string | undefined;
    let permittedAgentIds: Set<string> | undefined;

    if (teamId) {
      try {
        const team = teamStore.getTeam(username, teamId);
        if (team && team.teamType === "Orchestration") {
          inheritedWorkspaceDir = getTeamWorkspaceDir(username, teamId);
          permittedAgentIds = new Set(
            team.members.filter((m: any) => m.role !== "lead").map((m: any) => m.agentId),
          );
        }
      } catch (e) {
        console.error("[SessionToolFactory] Failed to load team restrictions:", e);
      }
    }

    const uiTools = createUiTools(workspaceDir, username, false, {
      workspaceDir,
      username,
      parentSessionId: sessionId,
      modelRegistry,
      authStorage,
      resourceLoader,
      inheritedWorkspaceDir,
      permittedAgentIds,
    });

    const userEnv = userConfigManager.getUserEnv(username);
    const hasExaKey = !!(userEnv.EXA_API_KEY || process.env.EXA_API_KEY);

    const allowedDirs = resourceLoader
      ? resourceLoader.getSkills().skills.map((s: any) => s.baseDir)
      : [];

    const readTool = createReadToolDefinition(workspaceDir, allowedDirs);
    const writeTool = createWriteToolDefinition(workspaceDir, allowedDirs);
    const editTool = createEditToolDefinition(workspaceDir, allowedDirs);
    const grepTool = createGrepToolDefinition(workspaceDir, allowedDirs);
    const findTool = createFindToolDefinition(workspaceDir, allowedDirs);
    const lsTool = createLsToolDefinition(workspaceDir, allowedDirs);

    const factoryTool = createFactoryTool({
      username,
      parentSessionId: sessionId,
    });

    const manageCustomToolsTool = createManageCustomToolsTool({
      username,
      sessionId,
    });

    const resolvedToolNames = contextAgentId
      ? new Set(scopeConfigManager.resolveToolsForAgent(username, contextAgentId))
      : null;

    const activeCustomDefs = customToolStorage
      .loadAll(username)
      .filter(
        (d: any) => d.enabled && (resolvedToolNames === null || resolvedToolNames.has(d.name)),
      );
    const activeCustomTools = activeCustomDefs.map((def: any) =>
      createCustomToolRuntime(def, {
        cwd: workspaceDir,
        session: null as any,
        username,
        sessionId,
      }),
    );

    const workflowTools = createWorkflowTools({
      username,
      sessionId,
      workflowEngine: params.workflowEngine,
    });

    const agentDirectoryTools = createAgentDirectoryTools({
      username,
      agentDirectory: params.agentDirectory,
    });

    const rawTools = [
      customBashTool,
      readTool,
      writeTool,
      editTool,
      grepTool,
      findTool,
      lsTool,
      factoryTool,
      manageCustomToolsTool,
      ...activeCustomTools,
      ...uiTools,
      exaSearchTool,
      webFetchTool,
      deepResearchTool,
      ...memoryTools,
      ...previewTools,
      ...workflowTools,
      ...agentDirectoryTools,
    ];

    const customTools: BaseTool[] = rawTools.map((t) => legacyToolToBaseTool(t));

    return {
      customTools,
      hasExaKey,
    };
  }
}

export const sessionToolFactory = new SessionToolFactory();
