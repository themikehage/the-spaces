// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { ApprovalManager } from "../core/approvals/approval-manager";

describe("ApprovalManager", () => {
  it("should request an approval and resolve it", async () => {
    const manager = new ApprovalManager();

    const requestPromise = manager.request({
      username: "user1",
      sessionId: "session-1",
      toolCallId: "call-1",
      toolName: "bash",
      args: { command: "echo hello" },
      reason: "Execution request",
      timeoutMs: 5000,
    });

    expect(manager.getAll("user1")).toHaveLength(1);
    expect(manager.getAll("user1")[0].approvalId).toBe("call-1");

    const resolved = manager.resolve("call-1", { action: "approve" });
    expect(resolved).toBe(true);

    const result = await requestPromise;
    expect(result.action).toBe("approve");
    expect(manager.getAll("user1")).toHaveLength(0);
  });

  it("should cancel all pending approvals for a session", async () => {
    const manager = new ApprovalManager();

    const p1 = manager.request({
      username: "user1",
      sessionId: "session-A",
      toolCallId: "call-A1",
      toolName: "bash",
      args: {},
      reason: "test A1",
    });

    const p2 = manager.request({
      username: "user1",
      sessionId: "session-A",
      toolCallId: "call-A2",
      toolName: "write",
      args: {},
      reason: "test A2",
    });

    const p3 = manager.request({
      username: "user1",
      sessionId: "session-B",
      toolCallId: "call-B1",
      toolName: "bash",
      args: {},
      reason: "test B1",
    });

    expect(manager.getAll("user1")).toHaveLength(3);

    const cancelledCount = manager.cancelSession("session-A");
    expect(cancelledCount).toBe(2);

    const res1 = await p1;
    const res2 = await p2;
    expect(res1.action).toBe("deny");
    expect(res2.action).toBe("deny");

    expect(manager.getAll("user1")).toHaveLength(1);
    expect(manager.getAll("user1")[0].approvalId).toBe("call-B1");

    manager.cancelSession("session-B");
    const res3 = await p3;
    expect(res3.action).toBe("deny");
    expect(manager.getAll("user1")).toHaveLength(0);
  });
});
