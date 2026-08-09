// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { agentTypeRegistry, CustomStrategy, GlobalStrategy, ProjectStrategy, SubagentStrategy, TeamStrategy, WorkflowStrategy, WorkspaceStrategy } from "./agent-type-registry";

describe("AgentTypeRegistry", () => {
  const username = "testuser";

  it("should return correct strategy for each AgentType", () => {
    expect(agentTypeRegistry.get("global")).toBeInstanceOf(GlobalStrategy);
    expect(agentTypeRegistry.get("project")).toBeInstanceOf(ProjectStrategy);
    expect(agentTypeRegistry.get("team")).toBeInstanceOf(TeamStrategy);
    expect(agentTypeRegistry.get("workspace")).toBeInstanceOf(WorkspaceStrategy);
    expect(agentTypeRegistry.get("subagent")).toBeInstanceOf(SubagentStrategy);
    expect(agentTypeRegistry.get("workflow")).toBeInstanceOf(WorkflowStrategy);
    expect(agentTypeRegistry.get("custom")).toBeInstanceOf(CustomStrategy);
    expect(agentTypeRegistry.get("user")).toBeInstanceOf(CustomStrategy);
  });

  it("should resolve workspace directories per strategy without throwing", () => {
    const globalDir = agentTypeRegistry.get("global").getWorkspaceDir(username, "global");
    expect(globalDir).toContain(username);

    const projectDir = agentTypeRegistry.get("project").getWorkspaceDir(username, "proj-1");
    expect(projectDir).toContain("proj-1");

    const teamDir = agentTypeRegistry.get("team").getWorkspaceDir(username, "team-1");
    expect(teamDir).toContain("team-1");

    const agentDir = agentTypeRegistry.get("custom").getWorkspaceDir(username, "agent-1");
    expect(agentDir).toContain("agent-1");
  });

  it("should correctly report listability per strategy", () => {
    expect(agentTypeRegistry.get("global").isListable()).toBe(true);
    expect(agentTypeRegistry.get("project").isListable()).toBe(true);
    expect(agentTypeRegistry.get("team").isListable()).toBe(true);
    expect(agentTypeRegistry.get("custom").isListable()).toBe(true);
    expect(agentTypeRegistry.get("subagent").isListable()).toBe(false);
    expect(agentTypeRegistry.get("workflow").isListable()).toBe(false);
  });
});
