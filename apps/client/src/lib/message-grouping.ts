// SPDX-License-Identifier: MIT
import type { MessageUsage } from "@/lib";

export interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  thinkingSignature?: string;
  name?: string;
  id?: string;
  arguments?: Record<string, unknown>;
  data?: string;
  mimeType?: string;
  image?: { url: string; title?: string };
}

export interface Message {
  role: string;
  content: string | ContentBlock[] | ContentBlock;
  toolName?: string;
  toolCallId?: string;
  isError?: boolean;
  isStreaming?: boolean;
  api?: string;
  provider?: string;
  model?: string;
  agentName?: string;
  agentAvatarUrl?: string;
  usage?: MessageUsage;
  stopReason?: string;
  errorMessage?: string;
  timestamp?: number;
  responseId?: string;
  id?: string;
  parentId?: string | null;
  siblings?: string[];
  args?: Record<string, any>;
  details?: {
    diff?: string;
    patch?: string;
    firstChangedLine?: number;
    totalResults?: number;
    searchType?: string;
    results?: Array<{ title?: string; url: string; publishedDate?: string }>;
    synthesizedOutput?: string;
    costDollars?: number;
    count?: number;
    memories?: Array<{
      id: string;
      type: string;
      importance: number;
      content: string;
      tags?: string[];
    }>;
    status?: string;
    type?: string;
    importance?: number;
    tags?: string[];
    deletedId?: string;
  };
}

export type RenderGroup =
  | { type: "user"; msg: Message }
  | { type: "system"; msg: Message }
  | { type: "tool_approval_request"; msg: Message }
  | { type: "agent"; messages: Message[] };

export function buildGroups(messages: Message[]): RenderGroup[] {
  const groups: RenderGroup[] = [];
  let agentBuf: Message[] = [];
  let currentAgentName: string | undefined = undefined;

  const flush = () => {
    if (agentBuf.length > 0) {
      groups.push({ type: "agent", messages: agentBuf });
      agentBuf = [];
    }
  };

  for (const msg of messages) {
    if (msg.role === "user") {
      flush();
      groups.push({ type: "user", msg });
      currentAgentName = undefined;
    } else if (msg.role === "system") {
      flush();
      groups.push({ type: "system", msg });
      currentAgentName = undefined;
    } else if (msg.role === "tool_approval_request") {
      flush();
      groups.push({ type: "tool_approval_request", msg });
      currentAgentName = undefined;
    } else {
      const msgAgentName = msg.agentName || msg.model || undefined;
      if (
        msg.role === "assistant" &&
        currentAgentName !== undefined &&
        currentAgentName !== msgAgentName
      ) {
        flush();
      }
      if (msg.role === "assistant") {
        currentAgentName = msgAgentName;
      }
      agentBuf.push(msg);
    }
  }
  flush();
  return groups;
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return time;
  const sameYear = d.getFullYear() === now.getFullYear();
  const month = d.toLocaleString([], { month: "short", day: "numeric" });
  return sameYear ? `${month}, ${time}` : `${month}, ${d.getFullYear()}, ${time}`;
}
