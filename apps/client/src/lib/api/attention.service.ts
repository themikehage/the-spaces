// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import { normalizeAttentionItem } from "@/lib/attention/normalize";
import type { AttentionItem, ResolveAttention } from "shared";

async function fetchPendingAttention(): Promise<AttentionItem[]> {
  const res = await apiFetch("/api/approvals");
  if (!res.ok) {
    throw new Error(`Failed to fetch approvals: ${res.statusText}`);
  }
  const data = await res.json();
  const rawList = Array.isArray(data?.pending) ? data.pending : [];
  return rawList
    .map(normalizeAttentionItem)
    .filter((item: AttentionItem | null): item is AttentionItem => item !== null);
}

async function resolveAttentionApi(id: string, body: ResolveAttention): Promise<boolean> {
  const res = await apiFetch(`/api/approvals/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export const attentionService = {
  fetchPendingAttention,
  resolveAttentionApi,
};
