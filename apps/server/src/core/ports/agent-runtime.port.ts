// SPDX-License-Identifier: MIT
import type { IEventBus } from "./event-bus.port";

export interface ContextUsageResult {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  limit: number | null;
}

export type AgentSessionEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: unknown[]; willRetry: boolean }
  | { type: "message_start"; message: unknown }
  | { type: "message_end"; message: unknown }
  | { type: "message_update"; assistantMessageEvent: unknown; message: unknown }
  | {
      type: "tool_execution_start";
      toolName: string;
      args: Record<string, unknown>;
      toolCallId: string;
      toolCall: { id: string; name: string; arguments: Record<string, unknown> };
    }
  | {
      type: "tool_execution_end";
      toolName: string;
      result: unknown;
      isError: boolean;
      toolCallId: string;
      toolCall: { id: string; name: string };
    }
  | {
      type: "tool_execution_update";
      toolCallId: string;
      toolName: string;
      partialResult: unknown;
    }
  | { type: "agent_error"; error: string };

export interface IAgentRuntime {
  readonly sessionId: string;
  readonly cwd: string;
  readonly isStreaming: boolean;
  readonly events?: IEventBus<AgentSessionEvent>;
  readonly messages: unknown[];
  model?: unknown;
  resourceLoader?: unknown;
  sessionManager?: unknown;
  sessionStore?: unknown;
  authStorage?: unknown;
  modelRegistry?: unknown;
  customTools?: unknown[];

  prompt(message: string, opts?: { signal?: AbortSignal; images?: string[] }): Promise<void>;
  abort(): Promise<void>;
  dispose(): Promise<void>;
  getMessages(): unknown[];
  getContextUsage(): ContextUsageResult;

  on(handler: (event: AgentSessionEvent) => void): () => void;
  subscribe(handler: (event: AgentSessionEvent) => void): () => void;

  setModel(model: unknown): void;
  setThinkingLevel(level: unknown): void;
  steer(message: string): Promise<void> | void;
  followUp(message: string): Promise<void> | void;
  compact(): Promise<void>;
  getSessionStats(): unknown;
  getActiveToolNames(): string[];
  setActiveToolsByName(names: string[]): void;
  navigateTree(targetMessageId: string, options?: unknown): Promise<unknown>;
  addDelegationResult?(resultMessage: unknown): void;
  continue?(): Promise<void> | void;
}
