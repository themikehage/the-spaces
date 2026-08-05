// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";

async function fetchProviders(): Promise<any[]> {
  const res = await apiFetch("/api/providers");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.providers || data;
}

async function refreshProviderModels(providerId: string): Promise<any> {
  const res = await apiFetch(`/api/providers/${providerId}/refresh`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchProviderModels(providerId: string): Promise<any[]> {
  const res = await apiFetch(`/api/providers/${providerId}/models`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.models || data;
}

async function saveProviderKey(providerId: string, apiKey: string): Promise<void> {
  const res = await apiFetch(`/api/providers/${providerId}/key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

async function deleteProviderKey(providerId: string): Promise<void> {
  const res = await apiFetch(`/api/providers/${providerId}/key`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export const providersService = {
  fetchProviders,
  refreshProviderModels,
  fetchProviderModels,
  saveProviderKey,
  deleteProviderKey,
};
