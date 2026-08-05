// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";

export type SessionStatus = "active" | "streaming" | "task-running" | "sleeping";

export interface SessionItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  status?: SessionStatus;
  projectId?: string;
  agentId?: string;
  teamId?: string;
  experimentId?: string;
  isExecution?: boolean;
  archived?: boolean;
}

async function fetchSessions(filters?: { archived?: boolean }): Promise<SessionItem[]> {
  const query = filters?.archived ? "?archived=true" : "";
  const res = await apiFetch(`/api/sessions${query}`);
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.statusText}`);
  const data = await res.json();
  return data.sessions ?? [];
}

async function fetchSessionStatuses(): Promise<Record<string, SessionStatus>> {
  const res = await apiFetch("/api/sessions/statuses");
  if (!res.ok) throw new Error(`Failed to fetch session statuses: ${res.statusText}`);
  const data = await res.json();
  return data.statuses ?? {};
}

async function createSession(data: Record<string, any>): Promise<SessionItem> {
  const res = await apiFetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to create session");
  }
  return res.json();
}

async function fetchSession(id: string): Promise<SessionItem> {
  const res = await apiFetch(`/api/sessions/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch session: ${res.statusText}`);
  return res.json();
}

async function archiveSession(id: string): Promise<void> {
  const res = await apiFetch(`/api/sessions/${id}/archive`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to archive session: ${res.statusText}`);
}

async function unarchiveSession(id: string): Promise<void> {
  const res = await apiFetch(`/api/sessions/${id}/unarchive`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to unarchive session: ${res.statusText}`);
}

async function deleteSession(id: string): Promise<void> {
  const res = await apiFetch(`/api/sessions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete session: ${res.statusText}`);
}

async function batchSessionAction(
  action: "archive" | "unarchive" | "delete",
  ids: string[],
): Promise<void> {
  const res = await apiFetch("/api/sessions/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ids }),
  });
  if (!res.ok) throw new Error(`Failed to execute batch action: ${res.statusText}`);
}

async function fetchSessionAnalytics(queryStr = ""): Promise<any> {
  const url = `/api/sessions/analytics${queryStr ? `?${queryStr}` : ""}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch session analytics: ${res.statusText}`);
  return res.json();
}

export const sessionsService = {
  fetchSessions,
  fetchSessionStatuses,
  createSession,
  fetchSession,
  archiveSession,
  unarchiveSession,
  deleteSession,
  batchSessionAction,
  fetchSessionAnalytics,
};
