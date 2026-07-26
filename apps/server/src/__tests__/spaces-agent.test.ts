// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { SpacesAgent, SpacesRunner } from "../sdk";

describe("SpacesAgent", () => {
  it("should initialize with declarative config and format AgentDefinition", () => {
    const agent = new SpacesAgent({
      name: "devops-engineer",
      instruction: "You are a DevOps engineer.",
      description: "Handles infrastructure tasks",
      temperature: 0.2,
      memory: false,
    });

    expect(agent.config.name).toBe("devops-engineer");
    expect(agent.config.instruction).toBe("You are a DevOps engineer.");

    const agentDef = agent.toAgentDefinition();
    expect(agentDef.id).toBe("devops-engineer");
    expect(agentDef.name).toBe("devops-engineer");
    expect(agentDef.systemPrompt).toBe("You are a DevOps engineer.");
  });

  it("should sanitize agent ID correctly", () => {
    const agent = new SpacesAgent({
      name: "My Special Agent 123!",
      instruction: "Do things.",
    });

    const agentDef = agent.toAgentDefinition();
    expect(agentDef.id).toBe("my-special-agent-123");
  });
});

describe("SpacesRunner", () => {
  it("should initialize runner and hold session ID", () => {
    const agent = new SpacesAgent({
      name: "test-runner-agent",
      instruction: "Hello test",
      memory: false,
    });

    const runner = new SpacesRunner(agent, {
      username: "test-user",
      sessionId: "custom-session-id-123",
    });

    expect(runner.sessionId).toBe("custom-session-id-123");
  });
});
