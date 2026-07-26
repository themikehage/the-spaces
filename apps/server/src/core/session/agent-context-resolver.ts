// SPDX-License-Identifier: MIT
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { cascadeConfigLoader, type EntityConfig } from "../config";
import { mcpRegistry } from "../mcp-registry";
import { getResolvedSkillPaths } from "../session-manager";
import { userConfigManager } from "./user-config";
import { resolveProjectDir, resolveSessionWorkspace } from "./workspace-resolver";

export interface ResolveAgentContextParams {
  username: string;
  sessionId: string;
  projectId?: string;
  agentId?: string;
  teamId?: string;
  customWorkspaceDir?: string;
  agentSkills?: string[];
  skipMemory?: boolean;
}

export interface ResolvedAgentContext {
  workspaceDir: string;
  sessionDir: string;
  projectDir: string | null;
  projectName?: string;
  projectId?: string;
  skillPaths: string[];
  cachedMcpToolNames: string[];
  userEnv: Record<string, string>;
  memoryEnabled: boolean;
  memoryDbPath: string;
  entityConfig: EntityConfig;
}

export async function resolveAgentContext(
  params: ResolveAgentContextParams,
): Promise<ResolvedAgentContext> {
  const {
    username,
    sessionId,
    projectId,
    agentId,
    teamId,
    customWorkspaceDir,
    agentSkills = [],
    skipMemory = false,
  } = params;

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

  let projectDir: string | null = null;
  let projectName: string | undefined;
  let resolvedProjectId = projectId;

  if (resolvedProjectId) {
    projectDir = resolveProjectDir(username, resolvedProjectId);
    if (projectDir) {
      const projectJsonPath = join(projectDir, "project.json");
      if (existsSync(projectJsonPath)) {
        try {
          const meta = JSON.parse(readFileSync(projectJsonPath, "utf-8"));
          projectName = meta.name;
          if (meta.id) resolvedProjectId = meta.id;
        } catch (e) {
          console.error("[resolveAgentContext] Failed to read project.json:", e);
        }
      }
    }
  }

  const entityConfig = await cascadeConfigLoader.load(username, {
    agentId,
    projectId: resolvedProjectId,
    teamId,
  });

  const skillPaths = getResolvedSkillPaths(workspaceDir, username);
  if (agentSkills.length > 0) {
    for (const sk of agentSkills) {
      const candidate = resolve(workspaceDir, ".pi", "skills", sk);
      if (existsSync(candidate) && !skillPaths.includes(candidate)) {
        skillPaths.push(candidate);
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

  const userEnv = userConfigManager.getUserEnv(username);
  const userSettings = userConfigManager.getUserSettings(username);
  const memoryEnabled = skipMemory ? false : (userSettings.memoryEnabled ?? true);
  const memoryDbPath = join(sessionDir, "memory", "memory.db");

  return {
    workspaceDir,
    sessionDir,
    projectDir,
    projectName,
    projectId: resolvedProjectId,
    skillPaths,
    cachedMcpToolNames,
    userEnv,
    memoryEnabled,
    memoryDbPath,
    entityConfig,
  };
}

