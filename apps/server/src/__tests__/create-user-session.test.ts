// SPDX-License-Identifier: MIT
import { getProjectsDir, getUserDir } from "@spaces/core";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AgentRegistry } from "../agents";
import {
  createUserSession,
  LeaderNotRegisteredError,
  LeaderRequiredError,
  TeamNotFoundError,
} from "../core/session/create-user-session";
import { SessionMetadataStore } from "../core/session/metadata-store";
import { TeamStore } from "../teams/team-store";

const agentRegistry = new AgentRegistry();
const sessionMetadataStore = new SessionMetadataStore();
const teamStore = new TeamStore();

describe("createUserSession domain helper", () => {
  const username = "test_user_session_semantics";
  const userDir = getUserDir(username);
  const projectsDir = getProjectsDir(username);

  beforeEach(() => {
    if (existsSync(userDir)) {
      rmSync(userDir, { recursive: true, force: true });
    }
    mkdirSync(userDir, { recursive: true });
    mkdirSync(projectsDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(userDir)) {
      rmSync(userDir, { recursive: true, force: true });
    }
  });

  it("T1: should create global session without project or team", async () => {
    const result = await createUserSession({
      username,
      name: "Global Session",
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("Global Session");
    expect(result.status).toBe("active");
    expect(result.projectId).toBeNull();
    expect(result.agentId).toBeNull();
    expect(result.teamId).toBeNull();

    const savedMeta = sessionMetadataStore.getSessionMetadata(username, result.id);
    expect(savedMeta).toBeDefined();
    expect(savedMeta?.name).toBe("Global Session");
  });

  it("T2: should resolve canonical projectId when given slug/name", async () => {
    const canonicalId = "proj-uuid-12345";
    const projDir = join(projectsDir, "my-slug-project");
    mkdirSync(projDir, { recursive: true });
    writeFileSync(
      join(projDir, "project.json"),
      JSON.stringify({ id: canonicalId, name: "my-slug-project" }),
      "utf-8",
    );

    const result = await createUserSession({
      username,
      name: "Project Session",
      projectId: "my-slug-project",
    });

    expect(result.projectId).toBe(canonicalId);

    const savedMeta = sessionMetadataStore.getSessionMetadata(username, result.id);
    expect(savedMeta?.projectId).toBe(canonicalId);
  });

  it("T3: should create team session for valid Orchestration team with leader", async () => {
    const spyGetTeam = spyOn(teamStore, "getTeam").mockReturnValue({
      id: "team-alpha",
      name: "Team Alpha",
      teamType: "Orchestration",
      members: [
        { agentId: "leader-agent", role: "lead" },
        { agentId: "worker-agent", role: "worker" },
      ],
    } as any);
    const spyGetAgent = spyOn(agentRegistry, "get").mockReturnValue({
      id: "leader-agent",
      name: "Leader Agent",
    } as any);

    const result = await createUserSession({
      username,
      name: "Team Session",
      teamId: "team-alpha",
    });

    expect(result.teamId).toBe("team-alpha");
    expect(result.agentId).toBe("leader-agent");

    spyGetTeam.mockRestore();
    spyGetAgent.mockRestore();
  });

  it("T4: should throw TeamNotFoundError if teamId does not exist", async () => {
    const spyGetTeam = spyOn(teamStore, "getTeam").mockReturnValue(null);

    await expect(
      createUserSession({
        username,
        name: "Broken Team Session",
        teamId: "non-existent-team",
      }),
    ).rejects.toThrow(TeamNotFoundError);

    spyGetTeam.mockRestore();
  });

  it("T5: should throw LeaderRequiredError if Orchestration team has no lead member", async () => {
    const spyGetTeam = spyOn(teamStore, "getTeam").mockReturnValue({
      id: "team-headless",
      name: "Headless Team",
      teamType: "Orchestration",
      members: [{ agentId: "worker-agent", role: "worker" }],
    } as any);

    await expect(
      createUserSession({
        username,
        name: "Headless Team Session",
        teamId: "team-headless",
      }),
    ).rejects.toThrow(LeaderRequiredError);

    spyGetTeam.mockRestore();
  });

  it("T6: should throw LeaderNotRegisteredError if leader agent is missing from registry", async () => {
    const spyGetTeam = spyOn(teamStore, "getTeam").mockReturnValue({
      id: "team-missing-lead",
      name: "Team Missing Lead",
      teamType: "Orchestration",
      members: [{ agentId: "missing-agent", role: "lead" }],
    } as any);
    const spyGetAgent = spyOn(agentRegistry, "get").mockReturnValue(null as any);

    await expect(
      createUserSession({
        username,
        name: "Missing Lead Session",
        teamId: "team-missing-lead",
      }),
    ).rejects.toThrow(LeaderNotRegisteredError);

    spyGetTeam.mockRestore();
    spyGetAgent.mockRestore();
  });
});
