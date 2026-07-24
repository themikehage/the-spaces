// SPDX-License-Identifier: MIT
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getAuditDir } from "shared";

export interface ToolCallAuditEvent {
  timestamp: string;
  sessionId: string;
  parentSessionId?: string;
  agentId?: string;
  toolName: string;
  durationMs: number;
  status: "success" | "error" | "blocked";
  argsSummary?: Record<string, unknown>;
  errorMsg?: string;
}

export function auditLog(username: string, action: string, details: Record<string, unknown>): void {
  try {
    const logDir = join(getAuditDir(), username);
    mkdirSync(logDir, { recursive: true });

    const entry = {
      action,
      ...details,
      timestamp: new Date().toISOString(),
    };

    appendFileSync(join(logDir, "env-access.log"), JSON.stringify(entry) + "\n", "utf-8");
  } catch (err) {
    console.error(`[Audit Log] Failed to write audit log for ${username}:`, err);
  }
}

function sanitizeArgs(args?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!args) return undefined;
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ["key", "token", "password", "secret", "auth", "api_key", "apikey"];
  for (const [k, v] of Object.entries(args)) {
    if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
      sanitized[k] = "[REDACTED]";
    } else if (typeof v === "string" && v.length > 500) {
      sanitized[k] = v.slice(0, 500) + "... [TRUNCATED]";
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

export function recordToolCallAudit(
  username: string,
  event: Omit<ToolCallAuditEvent, "timestamp">,
): void {
  try {
    const logDir = join(getAuditDir(), username);
    mkdirSync(logDir, { recursive: true });

    const entry: ToolCallAuditEvent = {
      timestamp: new Date().toISOString(),
      ...event,
      argsSummary: sanitizeArgs(event.argsSummary),
    };

    appendFileSync(join(logDir, "tool-calls.jsonl"), JSON.stringify(entry) + "\n", "utf-8");
  } catch (err) {
    console.error(`[Audit Log] Failed to write tool call audit log for ${username}:`, err);
  }
}

export function getToolCallLogs(username: string, limit = 100): ToolCallAuditEvent[] {
  try {
    const filePath = join(getAuditDir(), username, "tool-calls.jsonl");
    if (!existsSync(filePath)) return [];

    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    const logs: ToolCallAuditEvent[] = [];
    for (const line of lines.slice(-limit)) {
      try {
        logs.push(JSON.parse(line));
      } catch {}
    }
    return logs.reverse();
  } catch (err) {
    console.error(`[Audit Log] Failed to read tool call logs for ${username}:`, err);
    return [];
  }
}
