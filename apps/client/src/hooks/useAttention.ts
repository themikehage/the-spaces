// SPDX-License-Identifier: MIT
import { attentionStore } from "@/lib/attention/attention-store";
import { useSyncExternalStore } from "react";
import type { AttentionItem } from "shared";

export function useAttention(): AttentionItem[];
export function useAttention<T>(selector: (items: AttentionItem[]) => T): T;
export function useAttention<T>(selector?: (items: AttentionItem[]) => T): T | AttentionItem[] {
  const items = useSyncExternalStore(
    attentionStore.subscribe,
    attentionStore.getSnapshot,
    attentionStore.getSnapshot,
  );

  if (selector) {
    return selector(items);
  }

  return items;
}
