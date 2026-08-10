// SPDX-License-Identifier: MIT
import { wsClient } from "@/lib/ws-client";
import type { AttentionItem, ResolveAttention } from "shared";
import { fetchPendingAttention, resolveAttentionApi } from "./attention-api";
import { normalizeAttentionItem } from "./normalize";

type Listener = () => void;

class AttentionStore {
  private items: AttentionItem[] = [];
  private listeners = new Set<Listener>();
  private started = false;
  private unsubscribes: Array<() => void> = [];

  getSnapshot = (): AttentionItem[] => {
    return this.items;
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  async hydrate(): Promise<void> {
    try {
      const pending = await fetchPendingAttention();
      this.items = pending;
      this.notify();
    } catch (e) {
      console.error("[AttentionStore] Failed to hydrate pending items:", e);
    }
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    this.hydrate();

    const unsubReq = wsClient.subscribe("approval_request", (data: any) => {
      const item = normalizeAttentionItem(data?.approval);
      if (item) {
        this.addItem(item);
      }
    });

    const unsubRes = wsClient.subscribe("approval_resolved", (data: any) => {
      const id = data?.approvalId;
      if (id) {
        this.removeItem(id);
      }
    });

    const unsubCreated = wsClient.subscribe("attention_item_created", (data: any) => {
      const item = normalizeAttentionItem(data?.item);
      if (item) {
        this.addItem(item);
      }
    });

    const unsubResolved = wsClient.subscribe("attention_item_resolved", (data: any) => {
      const id = data?.approvalId ?? data?.itemId;
      if (id) {
        this.removeItem(id);
      }
    });

    const unsubWsState = wsClient.onStateChange((state) => {
      if (state === "connected") {
        this.hydrate();
      }
    });

    this.unsubscribes = [unsubReq, unsubRes, unsubCreated, unsubResolved, unsubWsState];
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];
  }

  addItem(item: AttentionItem): void {
    if (this.items.some((i) => i.approvalId === item.approvalId)) return;
    this.items = [item, ...this.items];
    this.notify();
  }

  removeItem(approvalId: string): void {
    if (!this.items.some((i) => i.approvalId === approvalId)) return;
    this.items = this.items.filter((i) => i.approvalId !== approvalId);
    this.notify();
  }

  clearBySession(sessionId: string): void {
    const before = this.items.length;
    this.items = this.items.filter((i) => i.sessionId !== sessionId);
    if (this.items.length !== before) {
      this.notify();
    }
  }

  async resolveApproval(
    approvalId: string,
    action: ResolveAttention["action"],
    payload?: Record<string, unknown>,
  ): Promise<boolean> {
    const previousSnapshot = this.items;
    this.removeItem(approvalId);

    try {
      const success = await resolveAttentionApi(approvalId, { action, payload });
      if (!success) {
        console.warn(`[AttentionStore] Server failed to resolve item ${approvalId}, rolling back.`);
        this.items = previousSnapshot;
        this.notify();
        return false;
      }
      return true;
    } catch (err) {
      console.error(`[AttentionStore] Error resolving item ${approvalId}, rolling back:`, err);
      this.items = previousSnapshot;
      this.notify();
      return false;
    }
  }
}

export const attentionStore = new AttentionStore();
