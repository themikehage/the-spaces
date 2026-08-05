// SPDX-License-Identifier: MIT
import { attentionService } from "@/lib/api/attention.service";
import type { AttentionItem, ResolveAttention } from "shared";

export async function fetchPendingAttention(): Promise<AttentionItem[]> {
  return attentionService.fetchPendingAttention();
}

export async function resolveAttentionApi(id: string, body: ResolveAttention): Promise<boolean> {
  return attentionService.resolveAttentionApi(id, body);
}
