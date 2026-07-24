// SPDX-License-Identifier: MIT
import { createProgrammaticSessionSync } from "../../auth/onboarding";
import {
  createBashToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
  createEditToolDefinition,
  createGrepToolDefinition,
  createFindToolDefinition,
  createLsToolDefinition
} from "../../ai";
import { filterSecretsFromOutput } from "../bash-output-filter";
import { createExaSearchTool } from "../tools/exa-search-tool";
import { createWebFetchTool } from "../tools/web-fetch";
import { createMemoryTools } from "../memory/memory-tools";
import { createUiTools } from "../tools/ui-tools";
import { createFactoryTool } from "../tools/factory-tool";
import { createPreviewTools } from "../tools/preview-tools";
import { teamStore } from "../../teams/team-store";
import { getTeamWorkspaceDir, type BaseTool, legacyToolToBaseTool } from "shared";
import { userConfigManager } from "./user-config";
import {
  createManageCustomToolsTool,
  customToolStorage,
  createCustomToolRuntime,
} from "../custom-tools";
import { scopeConfigManager } from "../scope";

export interface CreateSessionToolsParams {
  username: string;
  sessionId: string;
  workspaceDir: string;
  memoryEnabled: boolean;
  memory: any;
  modelRegistry: any;
  authStorage: any;
  resourceLoader: any;
  contextAgentId?: string;
  teamId?: string;
  projectId?: string;
}

export class SessionToolFactory {
  createSessionTools(params: CreateSessionToolsParams): { customTools: BaseTool[]; hasExaKey: boolean } {
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
        const token = createProgrammaticSessionSync(username);
        return {
          ...context,
          env: {
            ...context.env,
            ...userEnv,
            TOKEN: token,
            JWT_TOKEN: token,
          },
        };
      },
      outputFilter: (output: string) => {
        const userEnv = userConfigManager.getUserEnv(username);
        const secrets = Object.values(userEnv).filter(Boolean);
        return filterSecretsFromOutput(output, secrets);
      },
    });

    const exaSearchTool = createExaSearchTool({ username });
    const webFetchTool = createWebFetchTool({ username });
    const memoryTools = memoryEnabled ? createMemoryTools(memory) : [];

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
            team.members
              .filter((m: any) => m.role !== "lead")
              .map((m: any) => m.agentId)
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

    const allowedDirs = resourceLoader ? resourceLoader.getSkills().skills.map((s: any) => s.baseDir) : [];

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

    const activeCustomDefs = customToolStorage.loadAll(username).filter((d: any) =>
      d.enabled && (resolvedToolNames === null || resolvedToolNames.has(d.name))
    );
    const activeCustomTools = activeCustomDefs.map((def: any) =>
      createCustomToolRuntime(def, {
        cwd: workspaceDir,
        session: null as any,
        username,
        sessionId,
      })
    );

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
      ...memoryTools,
      ...previewTools,
    ];

    const customTools: BaseTool[] = rawTools.map((t) => legacyToolToBaseTool(t));

    return {
      customTools,
      hasExaKey,
    };
  }
}

export const sessionToolFactory = new SessionToolFactory();
