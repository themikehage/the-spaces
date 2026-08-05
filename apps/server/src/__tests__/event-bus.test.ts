// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import type { AgentSessionEvent } from "../core/session/agent-session";
import type { AgentMessage } from "../vendor/agent/src/types.ts";
import { TypedEventEmitter } from "../core/infra/event-bus";

const createMockMessage = (text: string): AgentMessage =>
  ({
    role: "assistant",
    content: [{ type: "text", text }],
  }) as unknown as AgentMessage;

describe("TypedEventEmitter (Core EventBus)", () => {
  it("should deliver specific event types to registered listeners", () => {
    const emitter = new TypedEventEmitter<AgentSessionEvent>();
    const received: AgentSessionEvent[] = [];

    emitter.on("message_start", (evt) => {
      received.push(evt);
    });

    const sampleEvent: AgentSessionEvent = {
      type: "message_start",
      message: createMockMessage("Hello"),
    };

    emitter.emit(sampleEvent);
    expect(received.length).toBe(1);
    expect(received[0]).toEqual(sampleEvent);
  });

  it("should deliver all events to onAny listeners", () => {
    const emitter = new TypedEventEmitter<AgentSessionEvent>();
    const received: AgentSessionEvent[] = [];

    emitter.onAny((evt) => {
      received.push(evt);
    });

    const evt1: AgentSessionEvent = {
      type: "message_start",
      message: createMockMessage("Starting..."),
    };
    const evt2: AgentSessionEvent = {
      type: "message_end",
      message: createMockMessage("Done"),
    };

    emitter.emit(evt1);
    emitter.emit(evt2);

    expect(received.length).toBe(2);
    expect(received[0]).toEqual(evt1);
    expect(received[1]).toEqual(evt2);
  });

  it("should allow unsubscribing listeners cleanly", () => {
    const emitter = new TypedEventEmitter<AgentSessionEvent>();
    let count = 0;

    const unsubscribe = emitter.on("message_start", () => {
      count++;
    });

    emitter.emit({ type: "message_start", message: createMockMessage("Test") });
    expect(count).toBe(1);

    unsubscribe();
    emitter.emit({ type: "message_start", message: createMockMessage("Test") });
    expect(count).toBe(1);
  });

  it("should isolate listener errors so other listeners still execute", () => {
    const emitter = new TypedEventEmitter<AgentSessionEvent>();
    let executed = false;

    emitter.onAny(() => {
      throw new Error("Broken listener");
    });

    emitter.onAny(() => {
      executed = true;
    });

    emitter.emit({ type: "message_start", message: createMockMessage("Test") });
    expect(executed).toBe(true);
  });

  it("should clear all listeners when clear() is called", () => {
    const emitter = new TypedEventEmitter<AgentSessionEvent>();
    let count = 0;

    emitter.onAny(() => {
      count++;
    });

    expect(emitter.listenerCount).toBe(1);
    emitter.clear();
    expect(emitter.listenerCount).toBe(0);

    emitter.emit({ type: "message_start", message: createMockMessage("Test") });
    expect(count).toBe(0);
  });
});
