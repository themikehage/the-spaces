// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type { CreateTeam, Team, TeamMember, TeamMessage, UpdateTeam } from "shared";

async function fetchTeams(): Promise<Team[]> {
  const res = await apiFetch("/api/teams");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.teams || [];
}

async function fetchTeamsByProject(projectId: string): Promise<Team[]> {
  const res = await apiFetch(`/api/teams?projectId=${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.teams || [];
}

async function fetchTeam(teamId: string): Promise<Team | null> {
  const res = await apiFetch(`/api/teams/${teamId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function createTeam(data: CreateTeam): Promise<Team> {
  const res = await apiFetch("/api/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function updateTeam(id: string, updates: UpdateTeam): Promise<Team> {
  const res = await apiFetch(`/api/teams/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function deleteTeam(id: string): Promise<void> {
  const res = await apiFetch(`/api/teams/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`HTTP ${res.status}`);
  }
}

async function uploadTeamAvatar(id: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch(`/api/teams/${id}/avatar`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.avatarUrl;
}

async function deleteTeamAvatar(id: string): Promise<void> {
  const res = await apiFetch(`/api/teams/${id}/avatar`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

async function fetchTeamMessages(
  teamId: string,
  sessionId?: string | null,
  limit = 100,
): Promise<TeamMessage[]> {
  const url = `/api/teams/${teamId}/messages?limit=${limit}${
    sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ""
  }`;
  const res = await apiFetch(url);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.messages || [];
}

async function fetchTeamActiveStreamings(
  teamId: string,
  sessionId?: string | null,
): Promise<Record<string, any>> {
  const url = `/api/teams/${teamId}/active-streamings${
    sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""
  }`;
  const res = await apiFetch(url);
  if (res.status === 404) return {};
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.streamingAgents || {};
}

async function sendTeamMessage(
  teamId: string,
  message: string,
  sessionId?: string | null,
): Promise<void> {
  const res = await apiFetch(`/api/teams/${teamId}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

async function abortTeamDispatch(
  teamId: string,
  sessionId?: string | null,
): Promise<void> {
  const res = await apiFetch(`/api/teams/${teamId}/abort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

async function addTeamMember(teamId: string, member: TeamMember): Promise<Team> {
  const res = await apiFetch(`/api/teams/${teamId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to add member" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function updateTeamMember(
  teamId: string,
  agentId: string,
  updates: Partial<TeamMember>,
): Promise<Team> {
  const res = await apiFetch(`/api/teams/${teamId}/members/${agentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function removeTeamMember(teamId: string, agentId: string): Promise<Team> {
  const res = await apiFetch(`/api/teams/${teamId}/members/${agentId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchTeamAnalytics(teamId: string): Promise<any> {
  const res = await apiFetch(`/api/teams/${teamId}/analytics`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const teamsService = {
  fetchTeams,
  fetchTeamsByProject,
  fetchTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  uploadTeamAvatar,
  deleteTeamAvatar,
  fetchTeamMessages,
  fetchTeamActiveStreamings,
  sendTeamMessage,
  abortTeamDispatch,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  fetchTeamAnalytics,
};
