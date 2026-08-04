// SPDX-License-Identifier: MIT
import type { AgentSessionEvent } from "../../ai/agent-session";

export type AgentEventTypeKey = AgentSessionEvent["type"];

export type AgentEventByType<K extends AgentEventTypeKey> = Extract<AgentSessionEvent, { type: K }>;

export interface IEventBus<T extends { type: string } = AgentSessionEvent> {
  emit(event: T): void;
  on<K extends T["type"]>(type: K, handler: (event: Extract<T, { type: K }>) => void): () => void;
  onAny(handler: (event: T) => void): () => void;
  clear(): void;
}
