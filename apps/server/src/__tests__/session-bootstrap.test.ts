// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { getUserDir } from "shared";
import { bootstrapAgentSession } from "../core/session/session-bootstrap";

function setupTestUser(prefix: string) {
  const username = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const userDir = getUserDir(username);
  mkdirSync(userDir, { recursive: true });
  return { username, userDir };
}

function cleanupTestUser(userDir: string) {
  try {
    if (existsSync(userDir)) {
      rmSync(userDir, { recursive: true, force: true });
    }
  } catch {}
}

describe("session-bootstrap profile and tool catalog integration", () => {
  it("should bootstrap a user session with canonical tools and memory policy", async () => {
    const { username, userDir } = setupTestUser("test_boot_user");
    try {
      const sessionId = "sess_user_bootstrap_001";
      const { session, runtime } = await bootstrapAgentSession({
        username,
        sessionId,
        profile: "user-session",
        skipMcpTools: true,
      });

      expect(session).toBeDefined();
      expect(runtime.workspaceDir).toBeDefined();

      const activeTools = session.getActiveToolNames();
      expect(activeTools).toContain("request_approval");
      expect(activeTools).toContain("ask_question");
      expect(activeTools).toContain("manage_delegations");
      expect(activeTools).toContain("decompose_tasks");
      expect(activeTools).toContain("memory_store");
    } finally {
      cleanupTestUser(userDir);
    }
  });

  it("should bootstrap an agent-server session with agent-server profile", async () => {
    const { username, userDir } = setupTestUser("test_boot_agent");
    try {
      const agentId = "agent_bot_001";
      const sessionId = `agent_server_${agentId}`;

      const { session, runtime } = await bootstrapAgentSession({
        username,
        sessionId,
        agentId,
        profile: "agent-server",
        skipMcpTools: true,
      });

      expect(session).toBeDefined();
      expect(runtime.context.sessionDir).toBeDefined();

      const activeTools = session.getActiveToolNames();
      expect(activeTools).toContain("read");
      expect(activeTools).toContain("write");
      expect(activeTools).toContain("edit");
      expect(activeTools).toContain("bash");
      expect(activeTools).toContain("request_approval");
    } finally {
      cleanupTestUser(userDir);
    }
  });

  it("should filter tools for subagent sessions when deny rules exist", async () => {
    const { username, userDir } = setupTestUser("test_boot_subagent");
    try {
      const sessionId = "subagent_bootstrap_test_001";
      const { session } = await bootstrapAgentSession({
        username,
        sessionId,
        profile: "subagent",
        skipMcpTools: true,
      });

      expect(session).toBeDefined();
      const activeTools = session.getActiveToolNames();
      expect(Array.isArray(activeTools)).toBe(true);
    } finally {
      cleanupTestUser(userDir);
    }
  });
});
