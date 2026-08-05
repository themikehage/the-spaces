// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { SessionManager } from "../core/session/session-manager";

describe("SessionManager - IAgentRuntime Integration", () => {
  it("should create and return an IAgentRuntime instance from getOrCreateSession", async () => {
    const manager = new SessionManager();
    const username = "testuser";
    const sessionId = "session-test-123";

    const session = await manager.getOrCreateSession(username, sessionId);

    expect(session).toBeDefined();
    expect(typeof session.sessionId).toBe("string");
    expect(typeof session.prompt).toBe("function");
    expect(typeof session.abort).toBe("function");
    expect(typeof session.getMessages).toBe("function");
    expect(typeof session.on).toBe("function");

    const retrieved = manager.getSession(username, sessionId);
    expect(retrieved).toBe(session);

    await manager.destroySession(username, sessionId);
    expect(manager.getSession(username, sessionId)).toBeNull();
  });

  it("should track live statuses using IAgentRuntime.isStreaming", async () => {
    const manager = new SessionManager();
    const username = "statususer";
    const sessionId = "session-status-456";

    const session = await manager.getOrCreateSession(username, sessionId);
    const statuses = manager.getLiveStatuses(username);

    expect(statuses[sessionId]).toBe("active");
    expect(session.isStreaming).toBe(false);

    await manager.destroySession(username, sessionId);
  });

  it("should allow subscribing to session events via IAgentRuntime.on", async () => {
    const manager = new SessionManager();
    const username = "eventuser";
    const sessionId = "session-event-789";

    await manager.getOrCreateSession(username, sessionId);

    const receivedEvents: any[] = [];
    const unsubscribe = manager.subscribeToSession(username, sessionId, (evt) => {
      receivedEvents.push(evt);
    });

    expect(typeof unsubscribe).toBe("function");

    unsubscribe();
    await manager.destroySession(username, sessionId);
  });
});
