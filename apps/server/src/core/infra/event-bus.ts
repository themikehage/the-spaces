// SPDX-License-Identifier: MIT
import type { IEventBus } from "../ports/event-bus.port";
import type { AgentSessionEvent } from "../session/agent-session";

export type EventListener<T = unknown> = (evt: T) => void | Promise<void>;

export type WorkflowSavedEvent = {
  type: "workflow:saved";
  username: string;
  workflowDef: { id: string; name: string; description?: string; systemPrompt?: string };
};

export type WorkflowDeletedEvent = {
  type: "workflow:deleted";
  username: string;
  workflowId: string;
};

export type CoreEvent = AgentSessionEvent | WorkflowSavedEvent | WorkflowDeletedEvent;

export class TypedEventEmitter<
  T extends { type: string } = CoreEvent,
> implements IEventBus<T> {
  private listeners: Set<EventListener<T>> = new Set();

  on<K extends T["type"]>(type: K, handler: (event: Extract<T, { type: K }>) => void | Promise<void>): () => void;
  on(handler: EventListener<T>): () => void;
  on(typeOrHandler: string | EventListener<T>, handler?: any): () => void {
    if (typeof typeOrHandler === "function") {
      return this.onAny(typeOrHandler);
    }

    const type = typeOrHandler;
    const targetHandler = handler!;
    const wrapper = async (evt: T) => {
      if (evt.type === type) {
        await targetHandler(evt as Extract<T, { type: typeof type }>);
      }
    };
    this.listeners.add(wrapper);
    return () => {
      this.listeners.delete(wrapper);
    };
  }

  onAny(handler: EventListener<T>): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  removeListener(listener: EventListener<T>): void {
    this.listeners.delete(listener);
  }

  async emit(event: T): Promise<void> {
    const results = await Promise.allSettled(
      [...this.listeners].map(async (listener) => listener(event)),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[TypedEventEmitter] Listener error:", result.reason);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

export const coreEventBus = new TypedEventEmitter<CoreEvent>();

