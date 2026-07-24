// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { normalizeAttentionItem } from "../normalize";

describe("lib/attention/normalize", () => {
  it("should normalize security approval items", () => {
    const raw = {
      approvalId: "appr-1",
      sessionId: "session-1",
      toolName: "bash",
      args: { command: "ls" },
      reason: "Security check",
    };
    const item = normalizeAttentionItem(raw);
    expect(item).not.toBeNull();
    expect(item?.approvalId).toBe("appr-1");
    expect(item?.sessionId).toBe("session-1");
    expect(item?.kind).toBe("approval");
    expect(item?.toolName).toBe("bash");
  });

  it("should normalize ask_question items as question kind", () => {
    const raw = {
      requestId: "req-1",
      sessionId: "session-2",
      toolName: "ask_question",
      params: { question: "What is your name?" },
    };
    const item = normalizeAttentionItem(raw);
    expect(item).not.toBeNull();
    expect(item?.approvalId).toBe("req-1");
    expect(item?.kind).toBe("question");
  });

  it("should normalize ui_action items correctly", () => {
    const raw = {
      id: "action-1",
      sessionId: "session-3",
      toolName: "custom_ui",
      type: "ui_action",
    };
    const item = normalizeAttentionItem(raw);
    expect(item).not.toBeNull();
    expect(item?.approvalId).toBe("action-1");
    expect(item?.kind).toBe("ui_action");
  });

  it("should return null for malformed items missing mandatory IDs", () => {
    expect(normalizeAttentionItem(null)).toBeNull();
    expect(normalizeAttentionItem({})).toBeNull();
    expect(normalizeAttentionItem({ approvalId: "123" })).toBeNull();
  });
});
