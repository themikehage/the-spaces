// SPDX-License-Identifier: MIT
import {
  getAgentWorkspaceDir,
  getGlobalAgentsMdPath,
  getProjectsDir,
  getProjectWorkspaceDir,
  getSessionDir,
  getTeamWorkspaceDir,
  getUserDir,
  getWorkspaceDir,
  getWorkspaceSkillsDir,
  SessionPrefix,
} from "@spaces/core";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { DEFAULT_AGENTS_MD, DEFAULT_FACTORY_SKILLS } from "../default-factory-skills";
import { ScopeConfigManager } from "../scope";
import { SessionMetadataStore } from "./metadata-store";
import { UserConfigManager } from "./user-config";

let scopeConfigManagerInstance: ScopeConfigManager | null = null;
function getScopeConfigManager(): ScopeConfigManager {
  if (!scopeConfigManagerInstance) {
    scopeConfigManagerInstance = new ScopeConfigManager();
  }
  return scopeConfigManagerInstance;
}

let sessionMetadataStoreInstance: SessionMetadataStore | null = null;
function getSessionMetadataStore(): SessionMetadataStore {
  if (!sessionMetadataStoreInstance) {
    sessionMetadataStoreInstance = new SessionMetadataStore();
  }
  return sessionMetadataStoreInstance;
}

let userConfigManagerInstance: UserConfigManager | null = null;
function getUserConfigManager(): UserConfigManager {
  if (!userConfigManagerInstance) {
    userConfigManagerInstance = new UserConfigManager();
  }
  return userConfigManagerInstance;
}

export function getResolvedSkillPaths(cwd: string, username?: string): string[] {
  const paths: string[] = [];

  if (username) {
    const factorySkillsDir = getWorkspaceSkillsDir(username);
    if (existsSync(factorySkillsDir) && !paths.includes(factorySkillsDir)) {
      paths.push(factorySkillsDir);
    }
  }

  let current = resolve(cwd);
  let workspaceRoot = current;
  while (true) {
    if (existsSync(resolve(current, "package.json")) || existsSync(resolve(current, "bun.lock"))) {
      workspaceRoot = current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  const localCandidates = [
    resolve(workspaceRoot, ".spaces/skills"),
    resolve(workspaceRoot, ".pi/skills"),
    resolve(workspaceRoot, ".agents/skills"),
    resolve(workspaceRoot, "pi/.pi/skills"),
    resolve(workspaceRoot, "pi/.agents/skills"),
  ];
  for (const candidate of localCandidates) {
    if (existsSync(candidate) && !paths.includes(candidate)) {
      paths.push(candidate);
    }
  }
  return paths;
}

export function ensureWorkspaceSubdirs(workspaceDir: string): void {
  const subdirs = [
    join(workspaceDir, ".spaces", "skills"),
    join(workspaceDir, "assets", "uploads"),
    join(workspaceDir, "assets", "generated"),
    join(workspaceDir, "memories", "projects"),
    join(workspaceDir, "memories", "sessions"),
  ];

  for (const dir of subdirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

export function ensureWorkspaceStructure(username: string): string {
  const workspaceDir = getWorkspaceDir(username);
  const skillsBaseDir = getWorkspaceSkillsDir(username);

  ensureWorkspaceSubdirs(workspaceDir);
  mkdirSync(getProjectsDir(username), { recursive: true });

  const agentsMdPath = getGlobalAgentsMdPath(username);
  if (!existsSync(agentsMdPath)) {
    try {
      const parentDir = join(workspaceDir, ".spaces");
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
      }
      const legacyPath = join(workspaceDir, "AGENTS.md");
      const content = existsSync(legacyPath)
        ? readFileSync(legacyPath, "utf-8")
        : DEFAULT_AGENTS_MD;
      writeFileSync(agentsMdPath, content, "utf-8");
    } catch (e) {
      console.error("Failed to write .spaces/AGENTS.md:", e);
    }
  }

  for (const [skillKey, skillDef] of Object.entries(DEFAULT_FACTORY_SKILLS)) {
    const skillDir = join(skillsBaseDir, skillKey);
    if (!existsSync(skillDir)) {
      mkdirSync(skillDir, { recursive: true });
    }
    const skillFilePath = join(skillDir, "SKILL.md");
    if (!existsSync(skillFilePath)) {
      try {
        writeFileSync(skillFilePath, skillDef.content, "utf-8");
      } catch (e) {
        console.error(`Failed to write skill ${skillKey}:`, e);
      }
    }
  }

  return workspaceDir;
}

export function resolveSubagentSessionDir(username: string, sessionId: string): string | null {
  if (
    sessionId.startsWith(SessionPrefix.SUBAGENT) ||
    sessionId.startsWith(SessionPrefix.DELEGATE)
  ) {
    const userDir = getUserConfigManager().ensureUserDir(username);
    const sessionsDir = join(userDir, "sessions");
    if (existsSync(sessionsDir)) {
      try {
        // Direct session dir check first (e.g. userDir/sessions/sub_... or userDir/sessions/del_...)
        const directDir = join(sessionsDir, sessionId);
        if (existsSync(directDir)) {
          return directDir;
        }

        // Subagents dir under parent check (e.g. userDir/sessions/parent/subagents/sub_...)
        const sessionFolders = readdirSync(sessionsDir);
        for (const parentId of sessionFolders) {
          const candidateDir = join(sessionsDir, parentId, "subagents", sessionId);
          if (existsSync(candidateDir)) {
            return candidateDir;
          }
        }
      } catch {
        /* noop */
      }
    }
  }
  return null;
}

function readProjectJson(projectPath: string): Record<string, unknown> | null {
  const filePath = join(projectPath, "project.json");
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export function resolveProjectDir(username: string, nameOrId: string): string | null {
  const projectsDir = getProjectsDir(username);
  if (!existsSync(projectsDir)) return null;
  const entries = readdirSync(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const projPath = join(projectsDir, entry.name);
    const proj = readProjectJson(projPath);
    if (proj && (proj.id === nameOrId || proj.name === nameOrId)) {
      return projPath;
    }
  }
  return null;
}

export function resolveProjectId(username: string, nameOrId: string): string | null {
  const projectsDir = getProjectsDir(username);
  if (!existsSync(projectsDir)) return null;
  const entries = readdirSync(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const projPath = join(projectsDir, entry.name);
    const proj = readProjectJson(projPath);
    if (proj && (proj.id === nameOrId || proj.name === nameOrId)) {
      return entry.name;
    }
  }
  return null;
}

export function resolveCanonicalProjectId(username: string, projectId: string): string {
  try {
    const projectDir = resolveProjectDir(username, projectId);
    if (projectDir) {
      const meta = readProjectJson(projectDir);
      if (meta?.id && typeof meta.id === "string") {
        return meta.id;
      }
    }
  } catch (e) {
    console.error("[WorkspaceResolver] Failed to resolve canonical projectId:", e);
  }
  return projectId;
}

export function resolveSessionWorkspace(
  username: string,
  sessionId: string,
  projectId?: string,
  agentId?: string,
  teamId?: string,
): { sessionDir: string; workspaceDir: string } {
  const sessionDir =
    resolveSubagentSessionDir(username, sessionId) ?? getSessionDir(username, sessionId);

  ensureWorkspaceStructure(username);

  const workspaceBase = getWorkspaceDir(username);
  let workspaceDir = workspaceBase;

  let resolvedProjectId = projectId;
  if (!resolvedProjectId && agentId) {
    try {
      const membership = getScopeConfigManager().getAgentMembership(username, agentId);
      if (membership?.type === "project") {
        resolvedProjectId = membership.id;
      }
    } catch (e) {
      console.error("[resolveSessionWorkspace] Failed to check agent membership:", e);
    }
  }

  if (teamId) {
    workspaceDir = getTeamWorkspaceDir(username, teamId);
  } else if (resolvedProjectId) {
    const resolved = resolveProjectDir(username, resolvedProjectId);
    if (resolved) {
      workspaceDir = join(resolved, "workspace");
    } else {
      workspaceDir = getProjectWorkspaceDir(username, resolvedProjectId);
    }
  } else if (agentId) {
    workspaceDir = getAgentWorkspaceDir(username, agentId);
  }

  if (!existsSync(workspaceDir)) {
    mkdirSync(workspaceDir, { recursive: true });
  }

  return { sessionDir, workspaceDir };
}

export function resolveSessionAllowedWriteDir(username: string, sessionId: string): string {
  const metadata = getSessionMetadataStore().getSessionMetadata(username, sessionId);
  if (!metadata) {
    return getUserDir(username);
  }

  if (metadata.parentSessionId) {
    return resolveSessionAllowedWriteDir(username, metadata.parentSessionId);
  }

  if (metadata.teamId) {
    return getTeamWorkspaceDir(username, metadata.teamId);
  }

  let resolvedProjectId = metadata.projectId ?? metadata.projectName;
  if (!resolvedProjectId && metadata.agentId) {
    try {
      const membership = getScopeConfigManager().getAgentMembership(username, metadata.agentId);
      if (membership?.type === "project") {
        resolvedProjectId = membership.id;
      }
    } catch {
      /* noop */
    }
  }

  if (resolvedProjectId) {
    const resolved = resolveProjectDir(username, resolvedProjectId);
    return resolved
      ? join(resolved, "workspace")
      : getProjectWorkspaceDir(username, resolvedProjectId);
  }

  if (metadata.agentId) {
    return getAgentWorkspaceDir(username, metadata.agentId);
  }

  return getUserDir(username);
}
