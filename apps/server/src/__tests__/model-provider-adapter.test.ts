// SPDX-License-Identifier: MIT
import { describe, expect, test } from "bun:test";
import { ModelProviderAdapter } from "../core/model/model-provider-adapter";
import { ModelRegistry } from "../core/model/model-registry";
import type { FetchFunction } from "../core/providers/openai-compatible";

function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function createTestRegistry() {
  const fakeAuthStorage = {
    getApiKey: () => undefined,
    hasAuth: () => true,
    get: () => ({ type: "apiKey", key: "" }),
    set: () => {},
    remove: () => {},
  } as any;

  const registry = ModelRegistry.create(
    fakeAuthStorage,
    () =>
      ({
        OPENROUTER_API_KEY: "or-key-123",
        OPENAI_API_KEY: "sk-invalid-openai",
      }) as Record<string, string>,
  );

  registry.registerProvider("openrouter", {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "$OPENROUTER_API_KEY",
    api: "openai-completions",
    defaultModel: "gpt-5.6-luna",
    models: [{ id: "gpt-5.6-luna", name: "GPT 5.6 Luna" }],
  });

  registry.registerProvider("openai", {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "$OPENAI_API_KEY",
    api: "openai-completions",
    defaultModel: "gpt-4o",
    models: [{ id: "gpt-4o", name: "GPT-4o" }],
  });

  return registry;
}

describe("ModelProviderAdapter", () => {
  test("resolves baseUrl, apiKey and raw model id from a composite modelId", async () => {
    const mockSseChunks = [
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      "data: [DONE]\n\n",
    ];

    const mockFetch: FetchFunction = async (url, init) => {
      expect(url.toString()).toBe("https://openrouter.ai/api/v1/chat/completions");
      expect((init?.headers as any)?.Authorization).toBe("Bearer or-key-123");
      expect(JSON.parse((init?.body as string) ?? "{}").model).toBe("gpt-5.6-luna");
      return new Response(createMockStream(mockSseChunks), { status: 200 });
    };

    const adapter = new ModelProviderAdapter(createTestRegistry(), mockFetch);

    const result = await adapter.streamComplete({
      messages: [{ role: "user", content: "Hola" }],
      modelId: "openrouter/gpt-5.6-luna",
    });

    expect(result.content).toBe("ok");
  });

  test("falls back to the first available model connection", async () => {
    const mockSseChunks = [
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      "data: [DONE]\n\n",
    ];

    const mockFetch: FetchFunction = async (url, init) => {
      expect(url.toString()).toBe("https://openrouter.ai/api/v1/chat/completions");
      expect((init?.headers as any)?.Authorization).toBe("Bearer or-key-123");
      return new Response(createMockStream(mockSseChunks), { status: 200 });
    };

    const adapter = new ModelProviderAdapter(createTestRegistry(), mockFetch);

    const result = await adapter.streamComplete({
      messages: [{ role: "user", content: "Hola" }],
    });

    expect(result.content).toBe("ok");
  });

  test("keeps an unmatched composite modelId verbatim using the default provider connection", async () => {
    const mockSseChunks = ['data: {"choices":[{"delta":{"content":"ok"}}]}\n\n', "data: [DONE]\n\n"];
    const seenUrls: string[] = [];

    const mockFetch: FetchFunction = async (url, init) => {
      seenUrls.push(url.toString());
      expect((init?.headers as any)?.Authorization).toBe("Bearer or-key-123");
      expect(JSON.parse((init?.body as string) ?? "{}").model).toBe("openai/gpt-5.6-luna");
      return new Response(createMockStream(mockSseChunks), { status: 200 });
    };

    const adapter = new ModelProviderAdapter(createTestRegistry(), mockFetch);
    await adapter.streamComplete({
      messages: [{ role: "user", content: "Hola" }],
      modelId: "openai/gpt-5.6-luna",
    });

    expect(seenUrls.some((u) => u.startsWith("https://api.openai.com"))).toBe(false);
    expect(seenUrls[0]).toContain("openrouter.ai");
  });
});