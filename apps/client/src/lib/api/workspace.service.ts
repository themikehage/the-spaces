// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type { FileInfo } from "shared";

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

async function getWorkspaceNode(path = "", scope?: ScopeOptions): Promise<FileInfo> {
  const normalizedPath = path.replace(/^\/+/, "");
  const query = buildScopeQuery(scope);
  const res = await apiFetch(`/api/workspace/${normalizedPath}${query}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function saveWorkspaceFile(
  path: string,
  content: string,
  scope?: ScopeOptions,
): Promise<FileInfo> {
  const normalizedPath = path.replace(/^\/+/, "");
  const query = buildScopeQuery(scope);
  const res = await apiFetch(`/api/workspace/${normalizedPath}${query}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "file", content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Save operation failed");
  }
  return res.json();
}

async function createWorkspaceNode(
  parentPath: string,
  name: string,
  type: "file" | "folder",
  scope?: ScopeOptions,
): Promise<void> {
  const fullPath = parentPath ? `${parentPath}/${name}` : name;
  const normalizedPath = fullPath.replace(/^\/+/, "");
  const query = buildScopeQuery(scope);
  const res = await apiFetch(`/api/workspace/${normalizedPath}${query}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create resource");
  }
}

async function renameWorkspaceNode(
  oldPath: string,
  newPath: string,
  scope?: ScopeOptions,
): Promise<FileInfo> {
  const normalizedPath = oldPath.replace(/^\/+/, "");
  const query = buildScopeQuery(scope);
  const res = await apiFetch(`/api/workspace/${normalizedPath}${query}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPath }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to rename resource");
  }
  return res.json();
}

async function deleteWorkspaceNode(path: string, scope?: ScopeOptions): Promise<void> {
  const normalizedPath = path.replace(/^\/+/, "");
  const query = buildScopeQuery(scope);
  const res = await apiFetch(`/api/workspace/${normalizedPath}${query}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete resource");
  }
}

async function getFileRawBlobUrl(path: string, scope?: ScopeOptions): Promise<string> {
  const normalizedPath = path.replace(/^\/+/, "");
  const baseQuery = buildScopeQuery(scope);
  const delimiter = baseQuery ? "&" : "?";
  const url = `/api/workspace/${normalizedPath}${baseQuery}${delimiter}raw=true`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to load raw file");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

async function downloadWorkspaceFile(
  path: string,
  fileName: string,
  scope?: ScopeOptions,
): Promise<void> {
  const normalizedPath = path.replace(/^\/+/, "");
  const baseQuery = buildScopeQuery(scope);
  const delimiter = baseQuery ? "&" : "?";
  const url = `/api/workspace/${normalizedPath}${baseQuery}${delimiter}download=true`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to download file");
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
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
  getWorkspaceNode,
  saveWorkspaceFile,
  createWorkspaceNode,
  renameWorkspaceNode,
  deleteWorkspaceNode,
  getFileRawBlobUrl,
  downloadWorkspaceFile,
  fetchPreviewState,
  fetchPreviewConfig,
  updatePreviewConfig,
  buildPreview,
};

