import type { IEventBus } from "@spaces/core";

export class EventBus<T extends { type: string }> implements IEventBus<T> {
  private handlers = new Map<string, Set<(event: any) => void>>();

  emit(event: T): void {
    const typeHandlers = this.handlers.get(event.type);
    if (!typeHandlers) return;
    for (const handler of typeHandlers) {
      handler(event);
    }
  }

  on<E extends T["type"]>(type: E, handler: (event: Extract<T, { type: E }>) => void): () => void {
    let typeHandlers = this.handlers.get(type);
    if (!typeHandlers) {
      typeHandlers = new Set();
      this.handlers.set(type, typeHandlers);
    }
    typeHandlers.add(handler as (event: any) => void);

    return () => {
      const currentHandlers = this.handlers.get(type);
      if (currentHandlers) {
        currentHandlers.delete(handler as (event: any) => void);
        if (currentHandlers.size === 0) {
          this.handlers.delete(type);
        }
      }
    };
  }

  clear(): void {
    this.handlers.clear();
  }
}
