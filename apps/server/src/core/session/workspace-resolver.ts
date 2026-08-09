// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
} from "shared";
import { DEFAULT_AGENTS_MD, DEFAULT_FACTORY_SKILLS } from "../prompts/default-factory-skills";
import { resolveEntityParent } from "../config/entity-membership";
import { sessionMetadataStore } from "./metadata-store";
import { userConfigManager } from "./user-config";

export function getResolvedSkillPaths(cwd: string, username?: string): string[] {
  const paths: string[] = [];
  const resolvedCwd = resolve(cwd);

  const addCandidate = (candidatePath: string) => {
    const resolvedCandidate = resolve(candidatePath);
    if (existsSync(resolvedCandidate) && !paths.includes(resolvedCandidate)) {
      paths.push(resolvedCandidate);
    }
  };

  const cwdCandidates = [
    resolve(resolvedCwd, ".spaces/skills"),
    resolve(resolvedCwd, ".pi/skills"),
    resolve(resolvedCwd, ".agents/skills"),
    resolve(resolvedCwd, "pi/.pi/skills"),
    resolve(resolvedCwd, "pi/.agents/skills"),
  ];
  for (const candidate of cwdCandidates) {
    addCandidate(candidate);
  }

  let current = resolvedCwd;
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

  if (workspaceRoot !== resolvedCwd) {
    const rootCandidates = [
      resolve(workspaceRoot, ".spaces/skills"),
      resolve(workspaceRoot, ".pi/skills"),
      resolve(workspaceRoot, ".agents/skills"),
      resolve(workspaceRoot, "pi/.pi/skills"),
      resolve(workspaceRoot, "pi/.agents/skills"),
    ];
    for (const candidate of rootCandidates) {
      addCandidate(candidate);
    }
  }

  if (username) {
    const factorySkillsDir = resolve(getWorkspaceSkillsDir(username));
    addCandidate(factorySkillsDir);
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
  const userDir = userConfigManager.ensureUserDir(username);

  if (sessionId.startsWith("wf-run-")) {
    const workflowsDir = join(userDir, "workflows");
    if (existsSync(workflowsDir)) {
      try {
        const wfFolders = readdirSync(workflowsDir);
        const runId = sessionId.slice("wf-run-".length);
        for (const wfId of wfFolders) {
          const candidateDir = join(workflowsDir, wfId, "runs", runId, "session");
          if (existsSync(candidateDir)) {
            return candidateDir;
          }
        }
      } catch {
        /* noop */
      }
    }
  }

  if (
    sessionId.startsWith(SessionPrefix.SUBAGENT) ||
    sessionId.startsWith(SessionPrefix.DELEGATE)
  ) {
    const sessionsDir = join(userDir, "sessions");
    if (existsSync(sessionsDir)) {
      try {
        const directDir = join(sessionsDir, sessionId);
        if (existsSync(directDir)) {
          return directDir;
        }

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

    const workflowsDir = join(userDir, "workflows");
    if (existsSync(workflowsDir)) {
      try {
        const wfFolders = readdirSync(workflowsDir);
        for (const wfId of wfFolders) {
          const runsDir = join(workflowsDir, wfId, "runs");
          if (existsSync(runsDir)) {
            const runFolders = readdirSync(runsDir);
            for (const rId of runFolders) {
              const candidateDir = join(runsDir, rId, "session", "subagents", sessionId);
              if (existsSync(candidateDir)) {
                return candidateDir;
              }
            }
          }
        }
      } catch {
        /* noop */
      }
    }
  }
  return null;
}

import {
  resolveCanonicalProjectId,
  resolveProjectDir,
  resolveProjectId,
} from "./project-resolver";

export { resolveCanonicalProjectId, resolveProjectDir, resolveProjectId };

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
      const parent = resolveEntityParent(username, agentId);
      if (parent?.type === "project") {
        resolvedProjectId = parent.id;
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
  const metadata = sessionMetadataStore.getSessionMetadata(username, sessionId);
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
      const parent = resolveEntityParent(username, metadata.agentId);
      if (parent?.type === "project") {
        resolvedProjectId = parent.id;
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
