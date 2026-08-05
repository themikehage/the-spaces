// SPDX-License-Identifier: MIT

export function handleAgentEvent(evt: any, sessionManager: any, emit: (event: any) => void): void {
  if (evt.type === "agent_start") {
    emit({ type: "agent_start" });
  } else if (evt.type === "agent_end") {
    for (const msg of evt.messages || []) {
      if (msg.role === "assistant" && msg.usage) {
        if (!msg.usage.cost) {
          msg.usage.cost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 };
        } else {
          const cost = msg.usage.cost;
          cost.input = cost.input ?? 0;
          cost.output = cost.output ?? 0;
          cost.cacheRead = cost.cacheRead ?? 0;
          cost.cacheWrite = cost.cacheWrite ?? 0;
          cost.total = cost.total ?? 0;
        }
      }
    }
    emit({ type: "agent_end", messages: evt.messages, willRetry: false });
  } else if (evt.type === "message_start") {
    emit({
      type: "message_start",
      message: evt.message,
    });
  } else if (evt.type === "message_end") {
    if (evt.message) {
      sessionManager.appendMessage(evt.message);
      if (evt.message.role === "assistant" && evt.message.stopReason === "error") {
        console.warn(
          `[AgentSession API Error] Session ${sessionManager.getSessionId()}:`,
          evt.message.errorMessage || "API error response",
        );
        emit({
          type: "agent_error",
          error: evt.message.errorMessage || "API error response",
        });
      }
    }
    emit({
      type: "message_end",
      message: evt.message,
    });
  } else if (evt.type === "message_update") {
    if (
      evt.assistantMessageEvent?.type === "text_delta" ||
      evt.assistantMessageEvent?.type === "thinking_delta"
    ) {
      emit({
        type: "message_update",
        assistantMessageEvent: evt.assistantMessageEvent,
        message: evt.message,
      });
    }
  } else if (evt.type === "tool_execution_start") {
    emit({
      type: "tool_execution_start",
      toolName: evt.toolName,
      args: evt.args,
      toolCallId: evt.toolCallId,
      toolCall: {
        id: evt.toolCallId,
        name: evt.toolName,
        arguments: evt.args,
      },
    });
  } else if (evt.type === "tool_execution_end") {
    emit({
      type: "tool_execution_end",
      toolName: evt.toolName,
      result: evt.result,
      isError: evt.isError,
      toolCallId: evt.toolCallId,
      toolCall: {
        id: evt.toolCallId,
        name: evt.toolName,
      },
    });
  } else if (evt.type === "tool_execution_update") {
    emit({
      type: "tool_execution_update",
      toolCallId: evt.toolCallId,
      toolName: evt.toolName,
      partialResult: evt.partialResult,
    });
  } else if (evt.type === "turn_end") {
    if (evt.message && evt.message.role === "assistant" && evt.message.errorMessage) {
      console.warn(
        `[AgentSession API Error] Session ${sessionManager.getSessionId()}:`,
        evt.message.errorMessage,
      );
      emit({ type: "agent_error", error: evt.message.errorMessage });
    }
  }
}
