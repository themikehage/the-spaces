import type { IEventBus } from "@spaces/core";

export class EventBus<T extends { type: string }> implements IEventBus<T> {
  private handlers = new Map<string, Set<(event: any) => void>>();

  emit(event: T): void {
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        handler(event);
      }
    }
    const wildcardHandlers = this.handlers.get("*");
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        handler(event);
      }
    }
  }

  on<E extends T["type"] | "*">(type: E, handler: (event: any) => void): () => void {
    let typeHandlers = this.handlers.get(type);
    if (!typeHandlers) {
      typeHandlers = new Set();
      this.handlers.set(type, typeHandlers);
    }
    typeHandlers.add(handler);

    return () => {
      const currentHandlers = this.handlers.get(type);
      if (currentHandlers) {
        currentHandlers.delete(handler);
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
