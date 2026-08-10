import type { AgentSessionEvent } from "./agent-runtime.port";

export type AgentEventTypeKey = AgentSessionEvent["type"];

export type AgentEventByType<K extends AgentEventTypeKey> = Extract<AgentSessionEvent, { type: K }>;

export interface IEventBus<T extends { type: string } = AgentSessionEvent> {
  emit(event: T): Promise<void> | void;
  on<K extends T["type"]>(type: K, handler: (event: Extract<T, { type: K }>) => void | Promise<void>): () => void;
  onAny(handler: (event: T) => void | Promise<void>): () => void;
  clear(): void;
  readonly listenerCount: number;
}
