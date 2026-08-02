import type { IModelProvider, StreamCompleteOptions } from "@spaces/core";
import type { LLMMessage, MessageDelta, ToolCall } from "@spaces/core";

export interface OpenAICompatibleOptions {
  name?: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export class OpenAICompatibleProvider implements IModelProvider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(opts: OpenAICompatibleOptions) {
    this.name = opts.name ?? "openai-compatible";
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this.model = opts.model;
  }

  async streamComplete(opts: StreamCompleteOptions): Promise<void> {
    const { messages, tools, system, signal, onDelta } = opts;

    const formattedMessages: Array<{ role: string; content: string | unknown[]; tool_call_id?: string }> = [];

    if (system) {
      formattedMessages.push({ role: "system", content: system });
    }

    for (const msg of messages) {
      if (typeof msg.content === "string") {
        formattedMessages.push({
          role: msg.role,
          content: msg.content,
          tool_call_id: msg.tool_call_id,
        });
      } else {
        // ContentBlock array
        formattedMessages.push({
          role: msg.role,
          content: msg.content,
          tool_call_id: msg.tool_call_id,
        });
      }
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages: formattedMessages,
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
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
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (trimmed === "data: [DONE]") return;

          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              const choice = data.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;
              if (delta?.content) {
                onDelta({
                  type: "text",
                  text: delta.content,
                });
              }

              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  onDelta({
                    type: "tool_use",
                    toolCall: {
                      id: tc.id,
                      name: tc.function?.name,
                      arguments: tc.function?.arguments ? JSON.parse(tc.function.arguments) : undefined,
                    },
                  });
                }
              }
            } catch {
              // Ignore malformed SSE JSON lines gracefully
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
