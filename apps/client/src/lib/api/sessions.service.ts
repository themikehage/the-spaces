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

async function fetchSessions(filters?: {
  archived?: boolean;
  projectId?: string;
}): Promise<SessionItem[]> {
  const params = new URLSearchParams();
  if (filters?.archived) params.append("archived", "true");
  if (filters?.projectId) params.append("projectId", filters.projectId);
  const query = params.toString() ? `?${params.toString()}` : "";
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

async function updateSession(id: string, updates: Record<string, any>): Promise<any> {
  const res = await apiFetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update session: ${res.statusText}`);
  return res.json();
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

async function fetchSessionTools(sessionId: string): Promise<any> {
  const res = await apiFetch(`/api/sessions/${sessionId}/tools`);
  if (!res.ok) throw new Error(`Failed to fetch session tools: ${res.statusText}`);
  return res.json();
}

async function updateSessionTools(sessionId: string, toolsOrConfig: any): Promise<void> {
  const body = Array.isArray(toolsOrConfig) ? { tools: toolsOrConfig } : toolsOrConfig;
  const res = await apiFetch(`/api/sessions/${sessionId}/tools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to update session tools: ${res.statusText}`);
}

async function sendSessionPrompt(sessionId: string, message: string): Promise<any> {
  const res = await apiFetch(`/api/sessions/${sessionId}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`Failed to send session prompt: ${res.statusText}`);
  return res.json();
}

async function updateSessionModel(
  sessionId: string,
  data: {
    provider: string;
    modelId: string;
    thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  },
): Promise<void> {
  const res = await apiFetch(`/api/sessions/${sessionId}/model`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: data.provider,
      modelId: data.modelId,
      thinkingLevel: data.thinkingLevel || "medium",
    }),
  });
  if (!res.ok) throw new Error(`Failed to update session model: ${res.statusText}`);
}

async function fetchSessionDelegations(sessionId: string): Promise<any[]> {
  const res = await apiFetch(`/api/sessions/${sessionId}/delegations`);
  if (!res.ok) throw new Error(`Failed to fetch delegations: ${res.statusText}`);
  const data = await res.json();
  return data.delegations || data;
}

async function abortSessionDelegation(sessionId: string, toolCallId: string): Promise<void> {
  const res = await apiFetch(`/api/sessions/${sessionId}/delegations/${toolCallId}/abort`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to abort delegation: ${res.statusText}`);
}

async function fetchSessionMessages(sessionId: string): Promise<any[]> {
  const res = await apiFetch(`/api/sessions/${sessionId}/messages`);
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.statusText}`);
  const data = await res.json();
  return data.messages || data;
}

async function fetchSessionSkills(sessionId: string): Promise<any[]> {
  const res = await apiFetch(`/api/sessions/${sessionId}/skills`);
  if (!res.ok) throw new Error(`Failed to fetch session skills: ${res.statusText}`);
  const data = await res.json();
  return data.skills || data;
}

async function updateSessionSkills(sessionId: string, skills: string[]): Promise<void> {
  const res = await apiFetch(`/api/sessions/${sessionId}/skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skills }),
  });
  if (!res.ok) throw new Error(`Failed to update session skills: ${res.statusText}`);
}

async function fetchSessionTasks(sessionId: string): Promise<any> {
  const res = await apiFetch(`/api/sessions/${sessionId}/tasks`);
  if (!res.ok) throw new Error(`Failed to fetch session tasks: ${res.statusText}`);
  return res.json();
}

async function updateSessionTaskStatus(
  sessionId: string,
  taskId: string,
  status: string,
): Promise<void> {
  const res = await apiFetch(`/api/sessions/${sessionId}/tasks/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, status }),
  });
  if (!res.ok) throw new Error(`Failed to update task status: ${res.statusText}`);
}

async function navigateSession(sessionId: string, path: string): Promise<void> {
  const res = await apiFetch(`/api/sessions/${sessionId}/navigate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) throw new Error(`Failed to navigate session: ${res.statusText}`);
}

export const sessionsService = {
  fetchSessions,
  fetchSessionStatuses,
  createSession,
  fetchSession,
  archiveSession,
  unarchiveSession,
  deleteSession,
  updateSession,
  batchSessionAction,
  fetchSessionAnalytics,
  fetchSessionTools,
  updateSessionTools,
  sendSessionPrompt,
  updateSessionModel,
  fetchSessionDelegations,
  abortSessionDelegation,
  fetchSessionMessages,
  fetchSessionSkills,
  updateSessionSkills,
  fetchSessionTasks,
  updateSessionTaskStatus,
  navigateSession,
};
