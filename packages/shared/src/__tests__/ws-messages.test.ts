// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { WsClientMessageSchema, isSessionScopedType } from "../ws-messages";

describe("packages/shared/ws-messages", () => {
  it("should successfully parse valid client messages", () => {
    const sub = WsClientMessageSchema.safeParse({
      type: "session_subscribe",
      sessionId: "session-123",
    });
    expect(sub.success).toBe(true);

    const unsub = WsClientMessageSchema.safeParse({
      type: "session_unsubscribe",
      sessionId: "session-123",
    });
    expect(unsub.success).toBe(true);

    const prompt = WsClientMessageSchema.safeParse({
      type: "prompt",
      sessionId: "session-123",
      message: "Hello agent",
    });
    expect(prompt.success).toBe(true);
  });

  it("should fail parsing legacy/incorrect client message types", () => {
    const legacySub = WsClientMessageSchema.safeParse({
      type: "subscribe_session",
      sessionId: "session-123",
    });
    expect(legacySub.success).toBe(false);

    const legacyUnsub = WsClientMessageSchema.safeParse({
      type: "unsubscribe_session",
      sessionId: "session-123",
    });
    expect(legacyUnsub.success).toBe(false);
  });

  it("should correctly identify session scoped types", () => {
    expect(isSessionScopedType("agent_start")).toBe(true);
    expect(isSessionScopedType("message_update")).toBe(true);
    expect(isSessionScopedType("session_subscribed")).toBe(true);
    expect(isSessionScopedType("approval_request")).toBe(false);
    expect(isSessionScopedType("project_updated")).toBe(false);
  });
});
