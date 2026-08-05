// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";

async function fetchEnvVars(): Promise<Record<string, string>> {
  const res = await apiFetch("/api/env");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.env || data;
}

async function saveEnvVar(key: string, value: string): Promise<void> {
  const res = await apiFetch("/api/env", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }
}

async function deleteEnvVar(key: string): Promise<void> {
  const res = await apiFetch(`/api/env/${key}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function revealEnvVar(key: string): Promise<string> {
  const res = await apiFetch(`/api/env/reveal/${key}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.value;
}

async function saveBulkEnvVars(variables: Record<string, string>): Promise<void> {
  const res = await apiFetch("/api/env", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variables }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }
}

export const envService = {
  fetchEnvVars,
  saveEnvVar,
  deleteEnvVar,
  revealEnvVar,
  saveBulkEnvVars,
};
