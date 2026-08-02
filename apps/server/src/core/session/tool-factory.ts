// SPDX-License-Identifier: MIT
import { getTeamWorkspaceDir, legacyToolToBaseTool, type BaseTool } from "@spaces/core";
import type { DefaultResourceLoader } from "../../ai";
import {
  createBashToolDefinition,
  createEditToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
} from "../../ai";
import type { AuthStorage } from "../../ai/auth-storage";
import type { ModelRegistry } from "../../ai/model-registry";
import { getOrCreateToolSessionToken } from "../../auth/ephemeral-tool-session";
import { TeamStore } from "../../teams/team-store";
import { filterSecretsFromOutput } from "../bash-output-filter";
import {
  createCustomToolRuntime,
  createManageCustomToolsTool,
  CustomToolStorage,
} from "../custom-tools";
import { createMemoryTools } from "../memory/memory-tools";
import type { MemoryProvider } from "../memory/types";
import { ScopeConfigManager } from "../scope";
import { createFactoryTool } from "../tools/factory-tool";
import { createPreviewTools } from "../tools/preview-tools";
import { createUiTools } from "../tools/ui-tools";
import { createWebFetchTool } from "../tools/web-fetch";
import { UserConfigManager } from "./user-config";

export interface CreateSessionToolsParams {
  username: string;
  sessionId: string;
  workspaceDir: string;
  subagentId?: string;
  contextAgentId?: string;
  teamId?: string;
  projectId?: string;
  modelRegistry?: ModelRegistry;
  authStorage?: AuthStorage;
  resourceLoader?: DefaultResourceLoader;
  memoryEnabled?: boolean;
  memory?: MemoryProvider;
}

export class SessionToolFactory {
  createTools(params: CreateSessionToolsParams): {
    tools: BaseTool[];
    customTools: BaseTool[];
    hasExaKey: boolean;
  } {
    const {
      username,
      sessionId,
      workspaceDir,
      contextAgentId,
      modelRegistry,
      authStorage,
      resourceLoader,
      memoryEnabled,
      memory,
    } = params;

    const teamStore = new TeamStore();
    const userConfigManager = new UserConfigManager();
    const scopeConfigManager = new ScopeConfigManager();

    const customToolStorage = new CustomToolStorage();
    const customToolDefs = customToolStorage.loadAll(username);
    const customTools = customToolDefs.map((def: any) =>
      createCustomToolRuntime(def, { workspaceDir }),
    );

    const bashTool = createBashToolDefinition(workspaceDir, {
      outputFilter: (output) => {
        const secrets: string[] = [];
        const userEnv = userConfigManager.getUserEnv(username);

        for (const [key, val] of Object.entries(process.env)) {
          if (val && (key.includes("TOKEN") || key.includes("SECRET") || key.includes("KEY"))) {
            secrets.push(val);
          }
        }
        for (const val of Object.values(userEnv)) {
          if (typeof val === "string" && val.length > 0) secrets.push(val);
        }

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

    const webFetchTool = createWebFetchTool({ username });
    const memoryTools = memoryEnabled && memory ? createMemoryTools(memory) : [];

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

    const builtInTools: { name: string; tool: BaseTool }[] = [
      { name: "read", tool: legacyToolToBaseTool(readTool) },
      { name: "write", tool: legacyToolToBaseTool(writeTool) },
      { name: "edit", tool: legacyToolToBaseTool(editTool) },
      { name: "grep", tool: legacyToolToBaseTool(grepTool) },
      { name: "find", tool: legacyToolToBaseTool(findTool) },
      { name: "ls", tool: legacyToolToBaseTool(lsTool) },
      { name: "bash", tool: legacyToolToBaseTool(bashTool) },
      { name: "web_fetch", tool: legacyToolToBaseTool(webFetchTool) },
      ...(Array.isArray(factoryTool)
        ? factoryTool.map((t: any) => ({ name: t.name, tool: t }))
        : [{ name: (factoryTool as any).name, tool: factoryTool }]),
      ...uiTools.map((t: any) => ({ name: t.name, tool: t })),
      ...previewTools.map((t: any) => ({ name: t.name, tool: t })),
      ...memoryTools.map((t: any) => ({ name: t.name, tool: t })),
      { name: manageCustomToolsTool.name, tool: manageCustomToolsTool },
    ];

    const filteredBuiltInTools = resolvedToolNames
      ? builtInTools.filter(({ name }) => resolvedToolNames.has(name)).map(({ tool }) => tool)
      : builtInTools.map(({ tool }) => tool);

    return {
      tools: filteredBuiltInTools,
      customTools,
      hasExaKey,
    };
  }
}
