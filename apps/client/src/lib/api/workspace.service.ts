// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";

async function fetchWorkspaceFiles(sessionId: string): Promise<any[]> {
  const res = await apiFetch(`/api/workspace/${encodeURIComponent(sessionId)}/files`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.files || data;
}

async function readWorkspaceFile(sessionId: string, path: string): Promise<string> {
  const res = await apiFetch(
    `/api/workspace/${encodeURIComponent(sessionId)}/file?path=${encodeURIComponent(path)}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.content ?? data;
}

async function writeWorkspaceFile(sessionId: string, path: string, content: string): Promise<void> {
  const res = await apiFetch(`/api/workspace/${encodeURIComponent(sessionId)}/file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

async function deleteWorkspaceFile(sessionId: string, path: string): Promise<void> {
  const res = await apiFetch(
    `/api/workspace/${encodeURIComponent(sessionId)}/file?path=${encodeURIComponent(path)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function uploadWorkspaceFile(sessionId: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch(`/api/workspace/${encodeURIComponent(sessionId)}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const workspaceService = {
  fetchWorkspaceFiles,
  readWorkspaceFile,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  uploadWorkspaceFile,
};
