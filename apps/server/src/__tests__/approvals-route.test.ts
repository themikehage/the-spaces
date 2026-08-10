import { describe, expect, it } from "bun:test";
import { createServerContext } from "../core/infra/server-context";

describe("routes/approvals", () => {
  it("should format approvals with correct kind discriminators", () => {
    const { approvalManager, uiApprovalRegistry } = createServerContext();
    approvalManager.request({
      toolCallId: "sec-1",
      username: "testuser",
      sessionId: "session-1",
      toolName: "bash",
      args: { command: "ls" },
      reason: "Run command",
    });

    uiApprovalRegistry.register("ui-1", {
      username: "testuser",
      sessionId: "session-1",
      toolName: "ask_question",
      args: { question: "Proceed?" },
    });

    uiApprovalRegistry.register("ui-2", {
      username: "testuser",
      sessionId: "session-1",
      toolName: "custom_ui",
      args: {},
    });

    const username = "testuser";
    const securityApprovals = approvalManager.getAll(username).map((a) => {
      const kind = "approval" as const;
      return { ...a, kind, type: kind };
    });
    const questionActions = uiApprovalRegistry.getAll(username).map((q) => {
      const kind = q.type === "ui_action" ? ("ui_action" as const) : ("question" as const);
      return { ...q, kind, type: kind };
    });
    const pending = [...securityApprovals, ...questionActions];

    const askQuestionItem = pending.find((i: any) => i.approvalId === "ui-1");
    expect(askQuestionItem?.kind).toBe("question");

    const uiActionItem = pending.find((i: any) => i.approvalId === "ui-2");
    expect(uiActionItem?.kind).toBe("ui_action");
  });
});
