// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type { AttentionItem, ResolveAttention } from "shared";
import { normalizeAttentionItem } from "./normalize";

export async function fetchPendingAttention(): Promise<AttentionItem[]> {
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

export async function resolveAttentionApi(
  id: string,
  body: ResolveAttention,
): Promise<boolean> {
  const res = await apiFetch(`/api/approvals/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}
