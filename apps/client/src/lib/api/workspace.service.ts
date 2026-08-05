// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";

export interface WorkspaceFile {
  path: string;
  name: string;
  type: "file" | "directory";
  size?: number;
  updatedAt?: string;
  children?: WorkspaceFile[];
}

export interface ScopeOptions {
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeChannelId?: string | null;
  activeTeamId?: string | null;
}

function buildScopeQuery(scope?: ScopeOptions): string {
  if (!scope) return "";
  const params = new URLSearchParams();
  if (scope.activeProjectName) params.append("project", scope.activeProjectName);
  if (scope.activeAgentId) params.append("agentId", scope.activeAgentId);
  if (scope.activeChannelId) params.append("channelId", scope.activeChannelId);
  if (scope.activeTeamId) params.append("teamId", scope.activeTeamId);
  const q = params.toString();
  return q ? `?${q}` : "";
}

async function fetchFiles(scope?: ScopeOptions): Promise<WorkspaceFile[]> {
  const query = buildScopeQuery(scope);
  const res = await apiFetch(`/api/workspace/files${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.files || [];
}

async function readFile(filePath: string, scope?: ScopeOptions): Promise<string> {
  const query = buildScopeQuery(scope);
  const delimiter = query ? "&" : "?";
  const res = await apiFetch(
    `/api/workspace/file${query}${delimiter}path=${encodeURIComponent(filePath)}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.content ?? "";
}

async function saveFile(filePath: string, content: string, scope?: ScopeOptions): Promise<void> {
  const query = buildScopeQuery(scope);
  const res = await apiFetch(`/api/workspace/file${query}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath, content }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function deleteFile(filePath: string, scope?: ScopeOptions): Promise<void> {
  const query = buildScopeQuery(scope);
  const delimiter = query ? "&" : "?";
  const res = await apiFetch(
    `/api/workspace/file${query}${delimiter}path=${encodeURIComponent(filePath)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function fetchWorkspaceUrl(url: string, init?: RequestInit): Promise<Response> {
  return apiFetch(url, init);
}

async function fetchPreviewState(projectName: string): Promise<any> {
  const res = await apiFetch(`/api/preview/state?project=${encodeURIComponent(projectName)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchPreviewConfig(projectName: string): Promise<any> {
  const res = await apiFetch(`/api/preview/config?project=${encodeURIComponent(projectName)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function updatePreviewConfig(projectName: string, config: any): Promise<any> {
  const res = await apiFetch(`/api/preview/config?project=${encodeURIComponent(projectName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function buildPreview(projectName: string): Promise<any> {
  const res = await apiFetch(`/api/preview/build?project=${encodeURIComponent(projectName)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const workspaceService = {
  fetchFiles,
  readFile,
  saveFile,
  deleteFile,
  fetchWorkspaceUrl,
  fetchPreviewState,
  fetchPreviewConfig,
  updatePreviewConfig,
  buildPreview,
};
