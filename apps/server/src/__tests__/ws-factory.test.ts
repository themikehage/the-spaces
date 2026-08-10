// SPDX-License-Identifier: MIT
import { beforeEach, describe, expect, it } from "bun:test";
import { createWsContext } from "../ws/factory";
import { wsRegistry } from "../ws/registry";

describe("ws/factory", () => {
  beforeEach(() => {
    // Clean registry between tests
    for (const [id] of wsRegistry.allMeta()) {
      wsRegistry.deleteMeta(id);
    }
    wsRegistry.userSockets.clear();
    wsRegistry.sessionSockets.clear();
    wsRegistry.teamSockets.clear();
  });

  it("should create context with unique id", () => {
    const ctx1 = createWsContext();
    const ctx2 = createWsContext();
    expect(ctx1.id).not.toBe(ctx2.id);
    expect(ctx1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("should retain id via closure across open/close lifecycle", async () => {
    const ctx = createWsContext();
    const capturedId = ctx.id;

    const mockWs = {
      send: () => {},
      close: () => {},
    } as any;

    const headers = new Headers();
    await ctx.onOpen(new Event("open"), mockWs, headers);

    const meta = wsRegistry.getMeta(capturedId);
    expect(meta).toBeDefined();
    expect(meta?.wsId).toBe(capturedId);
    expect(meta?.ws).toBe(mockWs);

    ctx.onClose({ code: 1000, reason: "test" }, mockWs);

    const afterClose = wsRegistry.getMeta(capturedId);
    expect(afterClose).toBeUndefined();
  });

  it("should not mutate ws object with wsId property", async () => {
    const ctx = createWsContext();
    const mockWs: any = {
      send: () => {},
      close: () => {},
    };

    const headers = new Headers();
    await ctx.onOpen(new Event("open"), mockWs, headers);

    expect(mockWs.wsId).toBeUndefined();
    expect(mockWs.raw?.wsId).toBeUndefined();

    ctx.onClose({ code: 1000 }, mockWs);
  });

  it("should handle pong and reset missedPings", async () => {
    const ctx = createWsContext();
    const mockWs: any = {
      send: () => {},
      close: () => {},
    };

    await ctx.onOpen(new Event("open"), mockWs, new Headers());
    const meta = wsRegistry.getMeta(ctx.id);
    if (meta) meta.missedPings = 2;

    const pongEvent = {
      data: JSON.stringify({ type: "pong" }),
    } as MessageEvent;

    await ctx.onMessage(pongEvent as any, mockWs);

    const afterPong = wsRegistry.getMeta(ctx.id);
    expect(afterPong?.missedPings).toBe(0);

    ctx.onClose({}, mockWs);
  });

  it("should create separate contexts without shared state", () => {
    const ctx1 = createWsContext();
    const ctx2 = createWsContext();

    expect(ctx1.getId()).toBe(ctx1.id);
    expect(ctx2.getId()).toBe(ctx2.id);
    expect(ctx1.getId()).not.toBe(ctx2.getId());
  });

  it("should reject invalid client messages with WS_INVALID_MESSAGE error code", async () => {
    const ctx = createWsContext();
    let sentData = "";
    const mockWs: any = {
      send: (data: string) => {
        sentData = data;
      },
      close: () => {},
    };

    await ctx.onOpen(new Event("open"), mockWs, new Headers());

    const invalidEvent = {
      data: JSON.stringify({ type: "subscribe_session", sessionId: "123" }),
    } as MessageEvent;

    await ctx.onMessage(invalidEvent as any, mockWs);

    expect(sentData).toContain("WS_INVALID_MESSAGE");
    ctx.onClose({}, mockWs);
  });

  it("should track unsub count and clean up previous unsub when setUnsub is called again", () => {
    const wsId = "test-ws-1";
    let oldUnsubCalled = false;
    let newUnsubCalled = false;

    wsRegistry.setUnsub(wsId, () => {
      oldUnsubCalled = true;
    });
    expect(wsRegistry.getActiveUnsubCount()).toBe(1);

    wsRegistry.setUnsub(wsId, () => {
      newUnsubCalled = true;
    });
    expect(oldUnsubCalled).toBe(true);
    expect(newUnsubCalled).toBe(false);
    expect(wsRegistry.getActiveUnsubCount()).toBe(1);

    wsRegistry.clearUnsub(wsId);
    expect(newUnsubCalled).toBe(true);
    expect(wsRegistry.getActiveUnsubCount()).toBe(0);
  });

  it("should accurately track session socket count", () => {
    const mockWs1 = {} as any;
    const mockWs2 = {} as any;
    const sId = "session-123";

    expect(wsRegistry.getSessionSocketCount(sId)).toBe(0);
    wsRegistry.addSessionSocket(sId, mockWs1);
    wsRegistry.addSessionSocket(sId, mockWs2);
    expect(wsRegistry.getSessionSocketCount(sId)).toBe(2);

    wsRegistry.removeSessionSocket(sId, mockWs1);
    expect(wsRegistry.getSessionSocketCount(sId)).toBe(1);

    wsRegistry.removeSessionSocket(sId, mockWs2);
    expect(wsRegistry.getSessionSocketCount(sId)).toBe(0);
  });
});
