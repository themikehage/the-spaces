import type {
  AgentEventType,
  AgentEventTypeKey,
  AgentEventByType,
  IEventBus,
} from "@auto-browser/core";

export class EventBus implements IEventBus {
  private handlers = new Map<string, Set<(event: AgentEventType) => void>>();
  private anyHandlers = new Set<(event: AgentEventType) => void>();

  emit(event: AgentEventType): void {
    const typed = this.handlers.get(event.type);
    if (typed) {
      for (const handler of typed) handler(event);
    }
    for (const handler of this.anyHandlers) handler(event);
  }

  on<K extends AgentEventTypeKey>(
    type: K,
    handler: (event: AgentEventByType<K>) => void,
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    const set = this.handlers.get(type)!;
    const wrapped = handler as (event: AgentEventType) => void;
    set.add(wrapped);
    return () => set.delete(wrapped);
  }

  onAny(handler: (event: AgentEventType) => void): () => void {
    this.anyHandlers.add(handler);
    return () => this.anyHandlers.delete(handler);
  }

  clear(): void {
    this.handlers.clear();
    this.anyHandlers.clear();
  }
}
