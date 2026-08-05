// SPDX-License-Identifier: MIT

export interface SessionStats {
  sessionFile: string;
  sessionId: string;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  toolResults: number;
  totalMessages: number;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  cost: number;
}

export function calculateSessionStats(
  sessionManager: any,
  messages: any[],
): SessionStats {
  const entries = sessionManager.getEntries();
  let userMessages = 0;
  let assistantMessages = 0;
  let toolCalls = 0;
  let toolResults = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  for (const entry of entries) {
    if (entry.type === "message") {
      if (entry.message.role === "user") userMessages++;
      if (entry.message.role === "assistant") {
        assistantMessages++;
        const tc =
          (entry.message.content as any)?.filter((c: any) => c.type === "toolCall") || [];
        toolCalls += tc.length;
      }
      if (entry.message.role === "toolResult") toolResults++;
    }
  }

  for (const m of messages) {
    const usage = (m as any).usage;
    if (usage) {
      tokensIn += usage.input || usage.promptTokens || usage.prompt_tokens || 0;
      tokensOut += usage.output || usage.completionTokens || usage.completion_tokens || 0;
    }
  }

  return {
    sessionFile: sessionManager.getSessionFile(),
    sessionId: sessionManager.getSessionId(),
    userMessages,
    assistantMessages,
    toolCalls,
    toolResults,
    totalMessages: entries.length,
    tokens: {
      input: tokensIn,
      output: tokensOut,
      cacheRead: 0,
      cacheWrite: 0,
      total: tokensIn + tokensOut,
    },
    cost: 0,
  };
}
