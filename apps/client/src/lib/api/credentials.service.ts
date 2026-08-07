import { apiFetch } from "@/lib/api";
import type { CredentialCreate, CredentialListItem } from "shared";

async function fetchCredentials(): Promise<CredentialListItem[]> {
  const res = await apiFetch("/api/credentials");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function createCredential(data: CredentialCreate): Promise<CredentialListItem> {
  const res = await apiFetch("/api/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function deleteCredential(id: string): Promise<void> {
  const res = await apiFetch(`/api/credentials/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export const credentialsService = {
  fetchCredentials,
  createCredential,
  deleteCredential,
};
