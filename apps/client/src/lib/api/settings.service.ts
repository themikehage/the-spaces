// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";

async function fetchSettings(): Promise<any> {
  const res = await apiFetch("/api/settings");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function updateSettings(settings: Record<string, any>): Promise<any> {
  const res = await apiFetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchModels(): Promise<any[]> {
  const res = await apiFetch("/api/models");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.models || data;
}

async function fetchImageModels(): Promise<any[]> {
  const res = await apiFetch("/api/models/images");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.models || data;
}

async function fetchVideoModels(): Promise<any[]> {
  const res = await apiFetch("/api/models/videos");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.models || data;
}

async function testVision(data: {
  modelId?: string;
  prompt?: string;
  image?: string;
  mimeType?: string;
}): Promise<any> {
  const res = await apiFetch("/api/settings/test-vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

async function testImageGen(data: {
  modelId?: string;
  prompt?: string;
  size?: string;
}): Promise<any> {
  const res = await apiFetch("/api/settings/test-image-gen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

async function testVideoGen(data: { modelId?: string; prompt?: string }): Promise<any> {
  const res = await apiFetch("/api/settings/test-video-gen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

async function fetchRawUrl(url: string, init?: RequestInit): Promise<Response> {
  return apiFetch(url, init);
}

async function exportBackup(type: "light" | "full"): Promise<Blob> {
  const res = await apiFetch(`/api/backup/export?type=${type}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

async function importBackup(mode: "merge" | "overwrite", file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch(`/api/backup/import?mode=${mode}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function uploadFactoryAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/api/settings/avatar", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.factoryAvatarUrl || data.avatarUrl;
}

async function deleteFactoryAvatar(): Promise<void> {
  const res = await apiFetch("/api/settings/avatar", {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function previewSystemPrompt(body: any): Promise<any> {
  const res = await apiFetch("/api/prompts/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchLogs(): Promise<any> {
  const res = await apiFetch("/api/logs");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const settingsService = {
  fetchSettings,
  updateSettings,
  fetchModels,
  fetchImageModels,
  fetchVideoModels,
  testVision,
  testImageGen,
  testVideoGen,
  fetchRawUrl,
  exportBackup,
  importBackup,
  uploadFactoryAvatar,
  deleteFactoryAvatar,
  previewSystemPrompt,
  fetchLogs,
};
