// SPDX-License-Identifier: MIT
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { AgentSession } from "../core/session/agent-session";
import { AuthStorage } from "../core/session/auth-storage";
import { JsonlSessionStore } from "../core/stores/session-persistence";

const TMP_TEST_DIR = join(import.meta.dirname, "../../tmp-tests");
const TEST_SESSION_FILE = join(TMP_TEST_DIR, "test-session.jsonl");

describe("AgentSession & Agent Class Integration Tests", () => {
  let sessionManager: JsonlSessionStore;
  let mockResourceLoader: any;
  let mockModelRegistry: any;
  let mockAuthStorage: AuthStorage;

  const mockModel = {
    id: "test-model",
    name: "Test Model",
    provider: "test-provider",
    api: "openai-responses",
    baseUrl: "http://localhost:8000",
    apiKey: "test-key",
    reasoning: false,
    contextWindow: 100000,
    maxTokens: 4096,
  };

  beforeEach(() => {
    if (!existsSync(TMP_TEST_DIR)) {
      mkdirSync(TMP_TEST_DIR, { recursive: true });
    }
    if (existsSync(TEST_SESSION_FILE)) {
      unlinkSync(TEST_SESSION_FILE);
    }

    sessionManager = JsonlSessionStore.create(TMP_TEST_DIR, TMP_TEST_DIR);
    sessionManager.setSessionFile(TEST_SESSION_FILE);

    mockResourceLoader = {
      getSystemPrompt: () => "You are a test agent.",
      getAppendSystemPrompt: () => [] as string[],
      getSkills: () => ({ skills: [], diagnostics: [] }),
    };

    mockModelRegistry = {
      find: () => mockModel,
      getAvailable: () => [mockModel],
      getApiKeyAndHeaders: async () => ({ ok: true, apiKey: "test-key" }),
    };

    mockAuthStorage = {
      getApiKey: () => undefined,
      hasAuth: () => false,
      getAuthStatus: () => ({ configured: false }),
      set: () => {},
      remove: () => {},
      reload: () => {},
    } as unknown as AuthStorage;
  });

  afterEach(() => {
    if (existsSync(TEST_SESSION_FILE)) {
      unlinkSync(TEST_SESSION_FILE);
    }
  });

  test("AgentSession initialization & state restore", () => {
    const session = new AgentSession({
      cwd: TMP_TEST_DIR,
      sessionManager,
      authStorage: mockAuthStorage,
      modelRegistry: mockModelRegistry,
      resourceLoader: mockResourceLoader,
    });

    expect(session).toBeDefined();
    expect(session.model?.id).toBe("test-model");
    expect(session.messages.length).toBe(0);
    expect(session.isStreaming).toBe(false);
  });

  test("AgentSession tool registration preserves customTools & BaseTools", () => {
    const mockCustomTool = {
      name: "test_tool",
      description: "A test tool",
      parameters: { type: "object", properties: {} },
      execute: async () => "result",
    };

    const mockBaseTool = {
      name: "base_tool",
      description: "Base tool description",
      declaration: {
        name: "base_tool",
        description: "Base tool description",
        parameters: {},
      },
      execute: async () => ({ content: "base result" }),
    };

    const session = new AgentSession({
      cwd: TMP_TEST_DIR,
      sessionManager,
      authStorage: mockAuthStorage,
      modelRegistry: mockModelRegistry,
      resourceLoader: mockResourceLoader,
      customTools: [mockCustomTool, mockBaseTool],
    });

    expect(session.activeTools.length).toBe(2);
    expect(session.activeTools.map((t) => t.name)).toEqual(["test_tool", "base_tool"]);
    expect(session.allToolsMap.has("test_tool")).toBe(true);
    expect(session.allToolsMap.has("base_tool")).toBe(true);
  });

  test("Prompt delegation updates message state", async () => {
    const session = new AgentSession({
      cwd: TMP_TEST_DIR,
      sessionManager,
      authStorage: mockAuthStorage,
      modelRegistry: mockModelRegistry,
      resourceLoader: mockResourceLoader,
    });

    mock.module("../ai/vendor/agent/src/agent.ts", () => {
      return {
        Agent: class MockAgent {
          state = {
            messages: [
              { role: "user", content: "hello", timestamp: Date.now() },
              {
                role: "assistant",
                content: [{ type: "text", text: "hi!" }],
                timestamp: Date.now(),
              },
            ],
            isStreaming: false,
            thinkingLevel: "off",
            tools: [] as any[],
          };
          private steering = [] as any[];
          private followUps = [] as any[];

          steer(msg: any) {
            this.steering.push(msg);
          }
          followUp(msg: any) {
            this.followUps.push(msg);
          }
          hasQueuedMessages() {
            return this.steering.length > 0 || this.followUps.length > 0;
          }
          subscribe(cb: any) {
            cb({
              type: "message_end",
              message: {
                role: "assistant",
                content: [{ type: "text", text: "hi!" }],
                timestamp: Date.now(),
              },
            });
            return () => {};
          }
          async prompt() {}
        },
      };
    });

    const sessionWithMock = new AgentSession({
      cwd: TMP_TEST_DIR,
      sessionManager,
      authStorage: mockAuthStorage,
      modelRegistry: mockModelRegistry,
      resourceLoader: mockResourceLoader,
    });

    await sessionWithMock.prompt("hello");

    expect(sessionWithMock.messages.length).toBeGreaterThan(0);
    expect(sessionWithMock.messages[0].role).toBe("user");
  });

  test("Steer and FollowUp queueing", () => {
    const session = new AgentSession({
      cwd: TMP_TEST_DIR,
      sessionManager,
      authStorage: mockAuthStorage,
      modelRegistry: mockModelRegistry,
      resourceLoader: mockResourceLoader,
    });

    session.steer("steering instruction");
    session.followUp("follow up instruction");

    expect((session as any).agent.hasQueuedMessages()).toBe(true);
  });
});
