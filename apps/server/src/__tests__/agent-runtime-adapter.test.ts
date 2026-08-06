// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { ToolExecutor } from "../core/infra/tool-executor";
import { ToolRegistry } from "../core/infra/tool-registry";
import { AgentRuntime, type AgentEngineAdapter } from "../core/session/agent-runtime-adapter";
import type { AgentSessionEvent } from "../core/session/agent-session";
import type { AgentMessage } from "../vendor/agent/src/types.ts";

const createMockMessage = (text: string): AgentMessage =>
  ({
    role: "assistant",
    content: [{ type: "text", text }],
  }) as unknown as AgentMessage;

describe("AgentRuntime Strategy Adapter", () => {
  it("should initialize cleanly with minimal dependencies", () => {
    const toolExecutor = new ToolExecutor(new ToolRegistry());
    const runtime = new AgentRuntime({
      sessionId: "session-123",
      cwd: "/workspace",
      toolExecutor,
    });

    expect(runtime.sessionId).toBe("session-123");
    expect(runtime.cwd).toBe("/workspace");
    expect(runtime.isStreaming).toBe(false);
    expect(runtime.getMessages()).toEqual([]);
    expect(runtime.getContextUsage()).toEqual({
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      limit: null,
    });
  });

  it("should delegate prompt execution and manage streaming state", async () => {
    const toolExecutor = new ToolExecutor(new ToolRegistry());
    let enginePromptCalled = false;

    const mockEngine: AgentEngineAdapter = {
      prompt: async (msg) => {
        enginePromptCalled = true;
        expect(msg).toBe("Test prompt");
      },
      abort: async () => {},
      getMessages: () => [{ role: "user", content: "Test prompt" }],
      getContextUsage: () => ({
        totalTokens: 100,
        inputTokens: 80,
        outputTokens: 20,
        limit: 4000,
      }),
      on: () => () => {},
    };

    const runtime = new AgentRuntime({
      sessionId: "session-123",
      cwd: "/workspace",
      toolExecutor,
      engineAdapter: mockEngine,
    });

    const promptPromise = runtime.prompt("Test prompt");
    expect(runtime.isStreaming).toBe(true);

    await promptPromise;
    expect(runtime.isStreaming).toBe(false);
    expect(enginePromptCalled).toBe(true);
    expect(runtime.getMessages().length).toBe(1);
    expect(runtime.getContextUsage().totalTokens).toBe(100);
  });

  it("should forward engine events through runtime event bus", () => {
    const toolExecutor = new ToolExecutor(new ToolRegistry());
    let engineEventHandler: ((evt: AgentSessionEvent) => void) | undefined;

    const mockEngine: AgentEngineAdapter = {
      prompt: async () => {},
      abort: async () => {},
      getMessages: () => [],
      getContextUsage: () => ({
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        limit: null,
      }),
      on: (handler) => {
        engineEventHandler = handler;
        return () => {};
      },
    };

    const runtime = new AgentRuntime({
      sessionId: "session-123",
      cwd: "/workspace",
      toolExecutor,
      engineAdapter: mockEngine,
    });

    const receivedEvents: AgentSessionEvent[] = [];
    runtime.on((evt) => {
      receivedEvents.push(evt);
    });

    expect(engineEventHandler).toBeDefined();
    const sampleEvt: AgentSessionEvent = {
      type: "message_start",
      message: createMockMessage("Hi"),
    };

    engineEventHandler!(sampleEvt);

    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0]).toEqual(sampleEvt);
  });

  it("should delegate abort and dispose to engine adapter", async () => {
    const toolExecutor = new ToolExecutor(new ToolRegistry());
    let engineAborted = false;
    let engineDisposed = false;

    const mockEngine: AgentEngineAdapter = {
      prompt: async () => {},
      abort: async () => {
        engineAborted = true;
      },
      dispose: async () => {
        engineDisposed = true;
      },
      getMessages: () => [],
      getContextUsage: () => ({
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        limit: null,
      }),
      on: () => () => {},
    };

    const runtime = new AgentRuntime({
      sessionId: "session-123",
      cwd: "/workspace",
      toolExecutor,
      engineAdapter: mockEngine,
    });

    await runtime.abort();
    expect(engineAborted).toBe(true);

    await runtime.dispose();
    expect(engineDisposed).toBe(true);
  });
});
