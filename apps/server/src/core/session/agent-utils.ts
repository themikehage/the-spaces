// SPDX-License-Identifier: MIT
import type { DelegationNotificationDetails, EnvelopeResult } from "shared";
import { AGENT_OUTPUT_MAX_CHARS, DELEGATION_NOTIFICATION_TYPE } from "shared";
import type { ModelRegistry } from "..";

/**
 * Parses the structured output envelope (status, executive_summary, artifacts, risks)
 * from an agent's response text.
 */
export function parseEnvelope(text: string, maxChars?: number): EnvelopeResult {
  const limit = maxChars ?? AGENT_OUTPUT_MAX_CHARS;
  const cleanText = text.trim();
  const validStatuses = ["success", "partial", "blocked", "error"] as const;

  const tryBuildEnvelope = (parsed: any): EnvelopeResult | null => {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    if (parsed.status || parsed.executive_summary) {
      let outputs: Record<string, unknown> =
        typeof parsed.outputs === "object" && parsed.outputs !== null
          ? (parsed.outputs as Record<string, unknown>)
          : {};

      if (Object.keys(outputs).length === 0) {
        const envelopeKeys = new Set(["status", "executive_summary", "artifacts", "risks", "outputs"]);
        const extraKeys: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (!envelopeKeys.has(key)) {
            extraKeys[key] = value;
          }
        }
        if (Object.keys(extraKeys).length > 0) {
          outputs = extraKeys;
        }
      }

      return {
        status: validStatuses.includes(parsed.status) ? parsed.status : "success",
        executive_summary: String(parsed.executive_summary ?? cleanText.slice(0, limit)),
        artifacts: String(parsed.artifacts ?? "none"),
        risks: String(parsed.risks ?? "None"),
        outputs,
      };
    }

    if (Object.keys(parsed).length > 0) {
      return {
        status: "success",
        executive_summary: cleanText.slice(0, limit),
        artifacts: "none",
        risks: "None",
        outputs: parsed as Record<string, unknown>,
      };
    }

    return null;
  };

  const fencedMatches = Array.from(cleanText.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi));
  for (let i = fencedMatches.length - 1; i >= 0; i--) {
    const candidateStr = fencedMatches[i][1].trim();
    try {
      const parsed = JSON.parse(candidateStr);
      const envelope = tryBuildEnvelope(parsed);
      if (envelope) return envelope;
    } catch {
      /* ignore */
    }
  }

  const findBalancedJsonObjects = (str: string): string[] => {
    const results: string[] = [];
    let depth = 0;
    let startIdx = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (char === "{") {
        if (depth === 0) startIdx = i;
        depth++;
      } else if (char === "}") {
        if (depth > 0) {
          depth--;
          if (depth === 0 && startIdx !== -1) {
            results.push(str.slice(startIdx, i + 1));
            startIdx = -1;
          }
        }
      }
    }
    return results;
  };

  const jsonBlocks = findBalancedJsonObjects(cleanText);
  for (let i = jsonBlocks.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(jsonBlocks[i]);
      const envelope = tryBuildEnvelope(parsed);
      if (envelope) return envelope;
    } catch {
      /* ignore */
    }
  }

  const result: EnvelopeResult = {
    status: "success",
    executive_summary: "",
    artifacts: "none",
    risks: "None",
    outputs: {},
  };

  result.executive_summary = cleanText.slice(0, limit);

  const lines = cleanText.split("\n");
  let hasStatus = false;
  let hasSummary = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(status|executive_summary|summary|artifacts|risks)\s*:\s*(.*)$/i);
    if (match) {
      const key = match[1].toLowerCase();
      const val = match[2].trim();
      if (key === "status") {
        result.status = validStatuses.includes(val as (typeof validStatuses)[number])
          ? (val as (typeof validStatuses)[number])
          : "success";
        hasStatus = true;
      } else if (key === "executive_summary" || key === "summary") {
        result.executive_summary = val;
        hasSummary = true;
      } else if (key === "artifacts") {
        result.artifacts = val;
      } else if (key === "risks") {
        result.risks = val;
      }
    }
  }

  if (!hasStatus && !hasSummary) {
    const cleanSummary = cleanText.replace(/---/g, "").trim().slice(0, limit);
    result.executive_summary = cleanSummary;
  }

  return result;
}

/**
 * Forwards a subagent's execution events (tokens, tool calls, thinking, etc.)
 * to the parent session so they can be rendered in the parent UI session.
 */
export function forwardSubagentEvents(
  subSession: { subscribe: (fn: (evt: any) => void) => () => void },
  parentSessionId: string,
  subagentSessionId: string,
  toolCallId: string,
): () => void {
  let unsub: (() => void) | undefined;
  try {
    unsub = subSession.subscribe((evt: any) => {
      try {
        import("../../ws/handler")
          .then(({ broadcastToSession }) => {
            broadcastToSession(parentSessionId, {
              type: "subagent_event",
              sessionId: parentSessionId,
              subagentSessionId,
              toolCallId,
              event: evt,
            });
          })
          .catch((err) => {
            console.error("[Subagent Event Forwarding Import Error]:", err);
          });
      } catch (err) {
        console.error("[Subagent Event Forwarding Error]:", err);
      }
    });
  } catch (err) {
    console.error("[forwardSubagentEvents] Subscribe failed:", err);
    unsub = () => {};
  }
  return unsub;
}

let registerChannelInterceptorFn: any = null;
let broadcastToSessionFn: any = null;

export function setWsHandlerBridge(registerInterceptor: any, broadcastSession: any) {
  registerChannelInterceptorFn = registerInterceptor;
  broadcastToSessionFn = broadcastSession;
}

/**
 * Extracts and cleans the text content from the last assistant message.
 * Handles both plain string messages and structured ContentBlock[] content.
 */
export function getLastAssistantText(messages: any[]): string {
  const assistantMsgs = messages.filter((m: any) => m.role === "assistant");
  const lastMsg = assistantMsgs[assistantMsgs.length - 1];
  if (!lastMsg || !lastMsg.content) return "";
  if (typeof lastMsg.content === "string") {
    return lastMsg.content;
  }
  if (Array.isArray(lastMsg.content)) {
    return lastMsg.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
  }
  return "";
}

/**
 * Resolves a model ID with a fallback to the first configured available model if needed.
 */
export function resolveModelWithFallback(
  modelId: string | undefined,
  modelRegistry: ModelRegistry,
): string | undefined {
  const configuredModels = modelRegistry.getAvailable();
  if (!modelId) {
    if (configuredModels.length > 0) {
      return `${configuredModels[0].provider}/${configuredModels[0].id}`;
    }
    return undefined;
  }
  const foundModel = configuredModels.find(
    (m) => m.id === modelId || `${m.provider}/${m.id}` === modelId,
  );
  if (!foundModel && configuredModels.length > 0) {
    return `${configuredModels[0].provider}/${configuredModels[0].id}`;
  }
  return modelId;
}

/**
 * Formats the delegation final output into a structured toolResult message.
 */
export function formatDelegationResultMessage(
  toolCallId: string,
  toolName: string,
  envelope: EnvelopeResult,
  subagentSessionId: string,
  outputText?: string,
): any {
  const details: DelegationNotificationDetails = {
    type: DELEGATION_NOTIFICATION_TYPE,
    status: envelope.status,
    toolName,
    toolCallId,
    subagentSessionId,
    executiveSummary: envelope.executive_summary,
    artifacts: envelope.artifacts,
    hasOutputText: !!(outputText && outputText.trim()),
  };

  const statusLabel = envelope.status === "success" ? "Completed" : envelope.status;
  const statusBadge = `[Delegation ${statusLabel}]`;
  const summary = envelope.executive_summary.slice(0, 300);
  const parts = [statusBadge, summary];

  if (envelope.artifacts && envelope.artifacts !== "none") {
    parts.push(`Artifacts: ${envelope.artifacts}`);
  }

  if (envelope.risks && envelope.risks !== "None") {
    parts.push(`Risks: ${envelope.risks}`);
  }

  if (envelope.outputs && Object.keys(envelope.outputs).length > 0) {
    parts.push(`Outputs:\n${JSON.stringify(envelope.outputs, null, 2)}`);
  }

  if (outputText && outputText.trim()) {
    parts.push(`\n${outputText.trim()}`);
  }

  const envelopeStr = parts.join("\n\n");

  return {
    role: "user",
    content: [{ type: "text", text: envelopeStr }],
    details,
    timestamp: Date.now(),
  };
}

/**
 * Collects and aggregates input and output tokens consumed in a channel session.
 * Utilizes channel messages as primary source and falls back to agent session stats.
 */
export function collectChannelTokens(
  channelStore: {
    getMessages: (username: string, channelId: string, limit: number, sessionId?: string) => any[];
  },
  agentRegistry: { get: (agentId: string) => any },
  username: string,
  channelId: string,
  sessionId: string,
  agentIds: string[],
): { tokensIn: number; tokensOut: number } {
  let tokensIn = 0;
  let tokensOut = 0;

  try {
    const messages = channelStore.getMessages(username, channelId, 100, sessionId);
    for (const msg of messages) {
      if (msg.role === "agent") {
        tokensIn += (msg as any).tokensIn || 0;
        tokensOut += (msg as any).tokensOut || 0;
      }
    }
  } catch (err) {
    console.error(`[collectChannelTokens] Failed to sum tokens from channel messages:`, err);
  }

  // Fallback: Query temporary agent session stats directly
  if (tokensIn === 0 && tokensOut === 0) {
    for (const agentId of agentIds) {
      try {
        const entry = agentRegistry.get(agentId);
        if (entry && entry.server && entry.server.session) {
          const stats = entry.server.session.getSessionStats();
          if (stats && stats.tokens) {
            tokensIn += stats.tokens.input || 0;
            tokensOut += stats.tokens.output || 0;
          }
          if (entry.server.session.messages) {
            for (const m of entry.server.session.messages) {
              const anyM = m as any;
              if (anyM.usage) {
                tokensIn += anyM.usage.input || 0;
                tokensOut += anyM.usage.output || 0;
              }
            }
          }
        }
      } catch (err) {
        console.error(
          `[collectChannelTokens] Fallback stats lookup failed for agent ${agentId}:`,
          err,
        );
      }
    }
  }

  return { tokensIn, tokensOut };
}

/**
 * Handles completing a delegation session, updating registry, formatting and posting results to parent session,
 * and waking up parent session if it is not currently streaming.
 */
export async function handleDelegationCompletion(opts: {
  username: string;
  parentSessionId: string;
  toolCallId: string;
  status: "success" | "error" | "blocked";
  envelope: EnvelopeResult;
  subagentSessionId: string;
  toolName: string;
  lastText?: string;
  includeFullHistory?: boolean;
  executionResultText?: string;
}) {
  const {
    username,
    parentSessionId,
    toolCallId,
    status,
    envelope,
    subagentSessionId,
    toolName,
    lastText = "",
    includeFullHistory = false,
    executionResultText = "",
  } = opts;

  // Complete in registry
  const { delegationRegistry } = await import("../delegation/delegation-registry");
  delegationRegistry.complete(username, parentSessionId, toolCallId, status, envelope);

  // Add to parent session's result queue
  const { sessionManager } = await import("./session-manager");
  let parent = sessionManager.getSession(username, parentSessionId);
  if (!parent) {
    try {
      parent = await sessionManager.getOrCreateSession(username, parentSessionId);
    } catch (e) {
      console.error(`[Delegation] Failed to load/create parent session ${parentSessionId}`, e);
    }
  }

  if (parent) {
    const toolResultMsg = formatDelegationResultMessage(
      toolCallId,
      toolName,
      envelope,
      subagentSessionId,
      lastText,
    );
    if (includeFullHistory && executionResultText) {
      const baseText = toolResultMsg.content[0].text;
      toolResultMsg.content = [
        {
          type: "text",
          text: `${baseText}\n\n=== FULL CONVERSATION HISTORY ===\n\n${executionResultText}`,
        },
      ];
    }
    (parent as any).addDelegationResult?.(toolResultMsg);

    // If parent is not active streaming, continue execution
    if (!parent.isStreaming) {
      let success = false;
      try {
        if (typeof (parent as any).continue === "function") {
          await (parent as any).continue();
        }
        success = true;
      } catch (e) {
        console.error("[Delegation Async Return] Parent continue fail, will retry in 1s:", e);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          if (typeof (parent as any).continue === "function") {
            await (parent as any).continue();
          }
          success = true;
        } catch (e2) {
          console.error("[Delegation Async Return] Parent continue retry fail:", e2);
        }
      }

      if (!success) {
        try {
          const { broadcastToUser } = await import("../../ws/handler");
          broadcastToUser(username, {
            type: "delegation_completed",
            parentSessionId,
            subagentSessionId,
            toolCallId,
            status,
            result: envelope,
          });
        } catch (e3) {
          console.error("Failed to broadcast fallback delegation_completed:", e3);
        }
      }
    }
  } else {
    console.warn(
      `[Delegation] Parent session ${parentSessionId} not found for toolCallId ${toolCallId} — delegation result discarded`,
    );
  }
}
