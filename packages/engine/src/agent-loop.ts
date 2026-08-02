import type {
  AgentMessage,
  IModelProvider,
  LLMMessage,
  LLMToolDefinition,
  MessageDelta,
  ToolCall,
  ToolResult,
} from "@spaces/core";

export interface AgentLoopConfig {
  modelProvider: IModelProvider;
  messages: LLMMessage[];
  tools: LLMToolDefinition[];
  systemPrompt: string;
  signal?: AbortSignal;
  maxIterations?: number;
  onMessageStart?: (msg: AgentMessage) => void;
  onMessageUpdate?: (msg: AgentMessage, delta: MessageDelta) => void;
  onMessageEnd?: (msg: AgentMessage) => Promise<void> | void;
  onToolCall?: (toolCall: ToolCall) => Promise<ToolResult>;
}

export async function runAgentLoop(config: AgentLoopConfig): Promise<void> {
  let iterations = 0;
  const maxIter = config.maxIterations ?? 25;

  while (iterations < maxIter) {
    if (config.signal?.aborted) {
      throw new Error("Agent execution aborted");
    }

    const assistantMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    config.onMessageStart?.(assistantMsg);

    const pendingToolCalls: ToolCall[] = [];
    let textAccumulator = "";

    await config.modelProvider.streamComplete({
      messages: config.messages,
      tools: config.tools,
      system: config.systemPrompt,
      signal: config.signal ?? new AbortController().signal,
      onDelta: (delta: MessageDelta) => {
        if (delta.type === "text" && delta.text) {
          textAccumulator += delta.text;
          assistantMsg.content = textAccumulator;
        } else if (delta.type === "tool_use" && delta.toolCall) {
          const tc = delta.toolCall as ToolCall;
          if (tc.id && tc.name) {
            pendingToolCalls.push(tc);
          }
        }
        config.onMessageUpdate?.(assistantMsg, delta);
      },
    });

    await config.onMessageEnd?.(assistantMsg);
    config.messages.push({
      role: "assistant",
      content: assistantMsg.content,
    });

    if (pendingToolCalls.length === 0) {
      break;
    }

    if (config.onToolCall) {
      const results = await Promise.all(
        pendingToolCalls.map((toolCall) => config.onToolCall!(toolCall))
      );

      for (const res of results) {
        const toolMsg: AgentMessage = {
          id: crypto.randomUUID(),
          role: "tool",
          content: res.output,
          createdAt: new Date().toISOString(),
        };
        config.onMessageStart?.(toolMsg);
        await config.onMessageEnd?.(toolMsg);

        config.messages.push({
          role: "tool",
          content: res.output,
          tool_call_id: res.toolCallId,
        });
      }
    }

    iterations++;
  }
}
