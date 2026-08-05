// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";

async function fetchProjects(): Promise<any[]> {
  const res = await apiFetch("/api/workspace-projects");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.projects || data;
}

async function createProject(data: { name: string; description?: string; color?: string }): Promise<any> {
  const res = await apiFetch("/api/workspace-projects", {
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

async function updateProject(id: string, data: any): Promise<any> {
  const res = await apiFetch(`/api/workspace-projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function deleteProject(id: string): Promise<void> {
  const res = await apiFetch(`/api/workspace-projects/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function uploadProjectAvatar(id: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch(`/api/workspace-projects/${id}/avatar`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.avatarUrl;
}

async function deleteProjectAvatar(id: string): Promise<void> {
  const res = await apiFetch(`/api/workspace-projects/${id}/avatar`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export const projectsService = {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  uploadProjectAvatar,
  deleteProjectAvatar,
};
