// SPDX-License-Identifier: MIT
import { getTeamWorkspaceDir } from "shared";
import { agentRegistry } from "../../agents";
import { teamStore } from "../../teams/team-store";
import { sessionManager } from "../session-manager";
import { resolveCanonicalProjectId } from "./workspace-resolver";

export class SessionDomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "SessionDomainError";
  }
}

export class TeamNotFoundError extends SessionDomainError {
  constructor(teamId: string) {
    super(`Team '${teamId}' not found`, 404);
    this.name = "TeamNotFoundError";
  }
}

export class LeaderRequiredError extends SessionDomainError {
  constructor() {
    super("Orchestration team requires a leader", 400);
    this.name = "LeaderRequiredError";
  }
}

export class LeaderNotRegisteredError extends SessionDomainError {
  constructor() {
    super("The orchestration leader is not available", 400);
    this.name = "LeaderNotRegisteredError";
  }
}

export interface CreateUserSessionInput {
  username: string;
  name?: string;
  projectId?: string;
  agentId?: string;
  teamId?: string;
}

export interface CreatedSessionDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  status: "active";
  projectId: string | null;
  agentId: string | null;
  teamId: string | null;
}

export async function createUserSession(
  input: CreateUserSessionInput,
): Promise<CreatedSessionDto> {
  const { username, name, projectId, agentId, teamId } = input;
  const newSessionId = crypto.randomUUID();

  let ownerAgentId = agentId;
  let workspaceDirOverride: string | undefined;

  if (teamId) {
    const team = teamStore.getTeam(username, teamId);
    if (!team) {
      throw new TeamNotFoundError(teamId);
    }

    const leader = team.members.find((member) => member.role === "lead");
    if (!leader) {
      throw new LeaderRequiredError();
    }

    const leaderAgent = agentRegistry.get(leader.agentId, username);
    if (!leaderAgent) {
      throw new LeaderNotRegisteredError();
    }

    ownerAgentId = leader.agentId;
    workspaceDirOverride = getTeamWorkspaceDir(username, teamId);
  }

  let resolvedProjectId = projectId;
  if (projectId) {
    resolvedProjectId = resolveCanonicalProjectId(username, projectId);
  }

  const now = new Date().toISOString();
  const sessionName = name || newSessionId;

  sessionManager.metadataStore.saveSessionMetadata(username, newSessionId, {
    name: sessionName,
    createdAt: now,
    updatedAt: now,
    projectId: resolvedProjectId || null,
    agentId: ownerAgentId || null,
    teamId: teamId || null,
  });

  await sessionManager.getOrCreateSession(
    username,
    newSessionId,
    resolvedProjectId,
    ownerAgentId,
    workspaceDirOverride ? { workspaceDir: workspaceDirOverride } : undefined,
  );

  const createdSessionItem: CreatedSessionDto = {
    id: newSessionId,
    name: sessionName,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    status: "active",
    projectId: resolvedProjectId || null,
    agentId: ownerAgentId || null,
    teamId: teamId || null,
  };

  return createdSessionItem;
}
