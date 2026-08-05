// SPDX-License-Identifier: MIT
import type {
  IModelProvider,
  LLMMessage,
  LLMToolDefinition,
  StreamCompleteOptions,
  StreamCompleteResult,
} from "../../core/ports/model.port";

export type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface OpenAICompatibleProviderOptions {
  baseUrl?: string;
  apiKey?: string;
  defaultModelId?: string;
  fetchFn?: FetchFunction;
}

export class OpenAICompatibleProvider implements IModelProvider {
  private baseUrl: string;
  private apiKey?: string;
  private defaultModelId: string;
  private fetchFn: FetchFunction;

  constructor(options: OpenAICompatibleProviderOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.defaultModelId = options.defaultModelId ?? "gpt-4o";
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async streamComplete(opts: StreamCompleteOptions): Promise<StreamCompleteResult> {
    const baseUrl = (opts.baseUrl ?? this.baseUrl).replace(/\/+$/, "");
    const apiKey = opts.apiKey ?? this.apiKey;
    const modelId = opts.modelId ?? this.defaultModelId;
    const url = `${baseUrl}/chat/completions`;

    const formattedMessages: LLMMessage[] = [];

    if (opts.system) {
      formattedMessages.push({
        role: "system",
        content: opts.system,
      });
    }

    formattedMessages.push(...opts.messages);

    const bodyPayload: Record<string, unknown> = {
      model: modelId,
      messages: formattedMessages,
      stream: true,
      stream_options: { include_usage: true },
    };

    if (opts.tools && opts.tools.length > 0) {
      bodyPayload.tools = opts.tools.map((t: LLMToolDefinition) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    if (typeof opts.temperature === "number") {
      bodyPayload.temperature = opts.temperature;
    }
    if (typeof opts.maxTokens === "number") {
      bodyPayload.max_tokens = opts.maxTokens;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await this.fetchFn(url, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyPayload),
      signal: opts.signal,
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        // Ignorar si no se puede leer el cuerpo
      }
      throw new Error(
        `[OpenAICompatibleProvider] Request failed with status ${response.status} (${response.statusText}): ${errorBody}`,
      );
    }

    if (!response.body) {
      throw new Error("[OpenAICompatibleProvider] Response body is null or undefined");
    }

    let accumulatedContent = "";
    let finishReason: string | undefined;
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

    const pendingToolCalls = new Map<number, { id: string; name: string; arguments: string }>();

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);

            if (parsed.usage) {
              usage = {
                promptTokens: parsed.usage.prompt_tokens ?? 0,
                completionTokens: parsed.usage.completion_tokens ?? 0,
                totalTokens: parsed.usage.total_tokens ?? 0,
              };
              opts.onDelta?.({
                type: "usage",
                usage,
              });
            }

            const choice = parsed.choices?.[0];
            if (!choice) continue;

            if (choice.finish_reason) {
              finishReason = choice.finish_reason;
            }

            const delta = choice.delta;
            if (!delta) continue;

            if (delta.content) {
              accumulatedContent += delta.content;
              opts.onDelta?.({
                type: "text_delta",
                text: delta.content,
              });
            }

            const reasoning = delta.reasoning_content ?? delta.reasoning;
            if (reasoning) {
              opts.onDelta?.({
                type: "reasoning_delta",
                text: reasoning,
              });
            }

            if (Array.isArray(delta.tool_calls)) {
              for (const tcDelta of delta.tool_calls) {
                const index = tcDelta.index ?? 0;
                let existing = pendingToolCalls.get(index);
                if (!existing) {
                  existing = { id: "", name: "", arguments: "" };
                  pendingToolCalls.set(index, existing);
                }

                if (tcDelta.id) {
                  existing.id = tcDelta.id;
                }
                if (tcDelta.function?.name) {
                  existing.name += tcDelta.function.name;
                }
                if (tcDelta.function?.arguments) {
                  existing.arguments += tcDelta.function.arguments;
                }

                opts.onDelta?.({
                  type: "tool_call_delta",
                  toolCall: {
                    index,
                    id: existing.id,
                    name: existing.name,
                    arguments: tcDelta.function?.arguments ?? "",
                  },
                });
              }
            }
          } catch {
            // Ignorar líneas JSON malformadas o fragmentadas en el SSE stream
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const toolCalls: Array<{
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }> = [];

    for (const [index, entry] of pendingToolCalls.entries()) {
      opts.onDelta?.({
        type: "tool_call_done",
        toolCall: {
          index,
          id: entry.id,
          name: entry.name,
          arguments: entry.arguments,
        },
      });

      let parsedArgs: Record<string, unknown> = {};
      if (entry.arguments.trim()) {
        try {
          parsedArgs = JSON.parse(entry.arguments);
        } catch (err) {
          console.error(
            `[OpenAICompatibleProvider] Failed to parse tool call arguments for ${entry.name}:`,
            err,
          );
        }
      }

      toolCalls.push({
        id: entry.id,
        name: entry.name,
        arguments: parsedArgs,
      });
    }

    return {
      content: accumulatedContent,
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      ...(usage ? { usage } : {}),
      ...(finishReason ? { finishReason } : {}),
    };
  }

  createModel(modelId?: string): unknown {
    return {
      provider: "openai-compatible",
      modelId: modelId ?? this.defaultModelId,
      baseUrl: this.baseUrl,
    };
  }

  getApiKey(): string | undefined {
    return this.apiKey;
  }
}
