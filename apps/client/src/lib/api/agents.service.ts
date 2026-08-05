// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type { AgentDefinition, AgentInfo } from "shared";

async function fetchAgents(): Promise<AgentInfo[]> {
  const res = await apiFetch("/api/agents");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.agents || [];
}

async function fetchAgent(id: string): Promise<AgentInfo> {
  const res = await apiFetch(`/api/agents/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function registerAgent(definition: AgentDefinition): Promise<AgentInfo> {
  const res = await apiFetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(definition),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function updateAgent(
  id: string,
  updates: Partial<Omit<AgentDefinition, "id">>,
): Promise<AgentInfo> {
  const res = await apiFetch(`/api/agents/${id}`, {
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

async function stopAgent(id: string): Promise<void> {
  const res = await apiFetch(`/api/agents/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`HTTP ${res.status}`);
  }
}

async function uploadAgentAvatar(id: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch(`/api/agents/${id}/avatar`, {
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

async function deleteAgentAvatar(id: string): Promise<void> {
  const res = await apiFetch(`/api/agents/${id}/avatar`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

async function promptAgent(id: string, message: string): Promise<string> {
  const res = await apiFetch(`/api/agents/${id}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, stream: false }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const msgs: any[] = data.messages || [];
  const last = [...msgs].reverse().find((m: any) => m.role === "assistant");
  if (!last) return "";
  if (typeof last.content === "string") return last.content;
  if (Array.isArray(last.content)) {
    return last.content.map((c: any) => c.text || "").join("\n");
  }
  return "";
}

async function fetchBlueprints(): Promise<any[]> {
  const res = await apiFetch("/api/gallery/blueprints");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.blueprints || data;
}

async function installBlueprint(bpId: string): Promise<any> {
  const res = await apiFetch(`/api/gallery/blueprints/${bpId}/install`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to install blueprint" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchAgentExecutions(agentId: string): Promise<any[]> {
  const res = await apiFetch(`/api/agents/${agentId}/executions`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.executions || data;
}

async function fetchAgentExecutionDetail(agentId: string, execId: string): Promise<any> {
  const res = await apiFetch(`/api/agents/${agentId}/executions/${execId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const agentsService = {
  fetchAgents,
  fetchAgent,
  registerAgent,
  updateAgent,
  stopAgent,
  uploadAgentAvatar,
  deleteAgentAvatar,
  promptAgent,
  fetchBlueprints,
  installBlueprint,
  fetchAgentExecutions,
  fetchAgentExecutionDetail,
};
