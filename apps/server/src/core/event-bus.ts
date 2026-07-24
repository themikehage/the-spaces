// SPDX-License-Identifier: MIT

export type EventListener<T = any> = (evt: T) => void;

export class TypedEventEmitter<T = any> {
  private listeners: Set<EventListener<T>> = new Set();

  on(listener: EventListener<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
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
