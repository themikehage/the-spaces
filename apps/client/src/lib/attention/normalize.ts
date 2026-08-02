// SPDX-License-Identifier: MIT
import type { AttentionItem, AttentionKind } from "@spaces/core";

export function normalizeAttentionItem(raw: any): AttentionItem | null {
  if (!raw || typeof raw !== "object") return null;

  const approvalId = raw.approvalId ?? raw.id ?? raw.requestId;
  const sessionId = raw.sessionId;
  if (!approvalId || !sessionId) return null;

  const toolName = raw.toolName ?? raw.tool ?? "";
  let kind: AttentionKind = "approval";

  if (raw.kind === "approval" || raw.kind === "question" || raw.kind === "ui_action") {
    kind = raw.kind;
  } else if (raw.type === "question" || toolName === "ask_question") {
    kind = "question";
  } else if (raw.type === "ui_action") {
    kind = "ui_action";
  }

  return {
    approvalId: String(approvalId),
    sessionId: String(sessionId),
    toolName: String(toolName),
    kind,
    type: kind,
    args: raw.args && typeof raw.args === "object" ? raw.args : (raw.params ?? {}),
    reason: raw.reason ? String(raw.reason) : "",
    expiresAt: typeof raw.expiresAt === "number" ? raw.expiresAt : undefined,
    status: raw.status ?? "pending",
    username: raw.username ? String(raw.username) : undefined,
    parentSessionId: raw.parentSessionId ? String(raw.parentSessionId) : undefined,
    projectId: raw.projectId ? String(raw.projectId) : undefined,
    agentId: raw.agentId ? String(raw.agentId) : undefined,
    teamId: raw.teamId ? String(raw.teamId) : undefined,
  };
}
