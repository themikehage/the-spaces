// SPDX-License-Identifier: MIT
import type { AgentSessionEvent } from "../ai/agent-session";
import type { IEventBus } from "./ports/event-bus.port";

export type EventListener<T = unknown> = (evt: T) => void;

export class TypedEventEmitter<
  T extends { type: string } = AgentSessionEvent,
> implements IEventBus<T> {
  private listeners: Set<EventListener<T>> = new Set();

  on<K extends T["type"]>(type: K, handler: (event: Extract<T, { type: K }>) => void): () => void;
  on(handler: EventListener<T>): () => void;
  on(typeOrHandler: string | EventListener<T>, handler?: any): () => void {
    if (typeof typeOrHandler === "function") {
      return this.onAny(typeOrHandler);
    }

    const type = typeOrHandler;
    const targetHandler = handler!;
    const wrapper = (evt: T) => {
      if (evt.type === type) {
        targetHandler(evt as Extract<T, { type: typeof type }>);
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

  emit(event: T): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("[TypedEventEmitter] Listener error:", err);
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
