// SPDX-License-Identifier: MIT
import { describe, expect, test } from "bun:test";
import type { MessageDelta } from "../core/ports/model.port";
import { OpenAICompatibleProvider, type FetchFunction } from "../core/providers/openai-compatible";

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

describe("OpenAICompatibleProvider", () => {
  test("instantiates with default and custom options", () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://api.custom-ai.com/v1/",
      apiKey: "test-api-key",
      defaultModelId: "custom-model",
    });

    expect(provider.getApiKey()).toBe("test-api-key");
    const model = provider.createModel("custom-model") as any;
    expect(model.provider).toBe("openai-compatible");
    expect(model.baseUrl).toBe("https://api.custom-ai.com/v1");
  });

  test("streamComplete processes text deltas and SSE [DONE]", async () => {
    const mockSseChunks = [
      'data: {"choices":[{"delta":{"content":"Hola"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" mundo!"}}]}\n\n',
      'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
      "data: [DONE]\n\n",
    ];

    const deltas: MessageDelta[] = [];
    const mockFetch: FetchFunction = async (url, init) => {
      expect(url.toString()).toBe("https://api.openai.com/v1/chat/completions");
      expect((init?.headers as any)?.Authorization).toBe("Bearer secret-key");

      return new Response(createMockStream(mockSseChunks), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    };

    const provider = new OpenAICompatibleProvider({
      apiKey: "secret-key",
      fetchFn: mockFetch,
    });

    const result = await provider.streamComplete({
      messages: [{ role: "user", content: "Hola" }],
      onDelta: (d) => deltas.push(d),
    });

    expect(result.content).toBe("Hola mundo!");
    expect(result.finishReason).toBe("stop");
    expect(deltas.filter((d) => d.type === "text_delta").length).toBe(2);
  });

  test("streamComplete assembles fragmented tool calls and parses arguments", async () => {
    const mockSseChunks = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_123","function":{"name":"read_file"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"path\\": \\"/tmp/"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"test.txt\\"}"}}]}}]}\n\n',
      "data: [DONE]\n\n",
    ];

    const deltas: MessageDelta[] = [];
    const mockFetch: FetchFunction = async () => {
      return new Response(createMockStream(mockSseChunks), {
        status: 200,
      });
    };

    const provider = new OpenAICompatibleProvider({ fetchFn: mockFetch });
    const result = await provider.streamComplete({
      messages: [{ role: "user", content: "Lee el archivo" }],
      tools: [
        {
          name: "read_file",
          description: "Read file content",
          parameters: { type: "object", properties: { path: { type: "string" } } },
        },
      ],
      onDelta: (d) => deltas.push(d),
    });

    expect(result.toolCalls).toBeDefined();
    expect(result.toolCalls?.length).toBe(1);
    expect(result.toolCalls![0]).toEqual({
      id: "call_123",
      name: "read_file",
      arguments: { path: "/tmp/test.txt" },
    });

    const doneDeltas = deltas.filter((d) => d.type === "tool_call_done");
    expect(doneDeltas.length).toBe(1);
  });

  test("streamComplete handles reasoning deltas and usage statistics", async () => {
    const mockSseChunks = [
      'data: {"choices":[{"delta":{"reasoning_content":"Pensando el problema..."}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Respuesta final"}}]}\n\n',
      'data: {"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}\n\n',
      "data: [DONE]\n\n",
    ];

    const deltas: MessageDelta[] = [];
    const mockFetch: FetchFunction = async () => {
      return new Response(createMockStream(mockSseChunks), { status: 200 });
    };

    const provider = new OpenAICompatibleProvider({ fetchFn: mockFetch });
    const result = await provider.streamComplete({
      messages: [{ role: "user", content: "Pregunta compleja" }],
      onDelta: (d) => deltas.push(d),
    });

    expect(result.content).toBe("Respuesta final");
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });

    const reasoningDeltas = deltas.filter((d) => d.type === "reasoning_delta");
    expect(reasoningDeltas.length).toBe(1);
    expect(reasoningDeltas[0].text).toBe("Pensando el problema...");
  });

  test("streamComplete throws clear error on HTTP non-2xx response", async () => {
    const mockFetch: FetchFunction = async () => {
      return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });
    };

    const provider = new OpenAICompatibleProvider({ fetchFn: mockFetch });

    expect(
      provider.streamComplete({
        messages: [{ role: "user", content: "Hola" }],
      }),
    ).rejects.toThrow("Request failed with status 401");
  });
});
