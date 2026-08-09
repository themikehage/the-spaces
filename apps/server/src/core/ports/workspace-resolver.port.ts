// SPDX-License-Identifier: MIT

export interface ResolvedWorkspaceSession {
  sessionDir: string;
  workspaceDir: string;
}

export interface IWorkspaceResolver {
  getResolvedSkillPaths(cwd: string, username?: string): string[];
  ensureWorkspaceSubdirs(workspaceDir: string): void;
  ensureWorkspaceStructure(username: string): string;
  resolveSubagentSessionDir(username: string, sessionId: string): string | null;
  resolveProjectDir(username: string, nameOrId: string): string | null;
  resolveProjectId(username: string, nameOrId: string): string | null;
  resolveCanonicalProjectId(username: string, projectId: string): string;
  resolveSessionWorkspace(
    username: string,
    sessionId: string,
    projectId?: string,
    agentId?: string,
    teamId?: string,
  ): ResolvedWorkspaceSession;
}
