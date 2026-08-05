import type { AgentMessage } from "../types.ts";

export type AgentEventType =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: AgentMessage[] }
  | { type: "turn_start" }
  | { type: "turn_end"; message: AgentMessage; toolResults: AgentMessage[] }
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AgentMessage; delta: unknown }
  | { type: "message_end"; message: AgentMessage }
  | { type: "tool_execution_start"; toolCallId: string; toolName: string; args: unknown }
  | { type: "tool_execution_update"; toolCallId: string; toolName: string; partialResult: unknown }
  | {
      type: "tool_execution_end";
      toolCallId: string;
      toolName: string;
      result: unknown;
      isError: boolean;
    }
  | { type: "agent_error"; error: string };

export type AgentEventTypeKey = AgentEventType["type"];

export type AgentEventByType<K extends AgentEventTypeKey> = Extract<AgentEventType, { type: K }>;

export interface IEventBus {
  emit(event: AgentEventType): void;
  on<K extends AgentEventTypeKey>(
    type: K,
    handler: (event: AgentEventByType<K>) => void,
  ): () => void;
  onAny(handler: (event: AgentEventType) => void): () => void;
  clear(): void;
}
