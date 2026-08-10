// SPDX-License-Identifier: MIT
import type { IAgentRuntime } from "./agent-runtime.port";

export interface SessionOverrides {
  model?: { provider: string; modelId: string };
  resourceLoader?: unknown;
  customTools?: unknown[];
  workspaceDir?: string;
  skipMcpTools?: boolean;
  skipMemory?: boolean;
}

export interface ISessionManager {
  getSession(username: string, sessionId: string): IAgentRuntime | null;
  getOrCreateSession(
    username: string,
    sessionId: string,
    projectId?: string,
    agentId?: string,
    overrides?: SessionOverrides,
  ): Promise<IAgentRuntime>;
  destroySession(username: string, sessionId: string): Promise<void>;
  destroyAllSessions?(username?: string): Promise<void>;
  listSessions(username: string, query?: any): Promise<any[]>;
  getLiveStatuses(username: string): Record<string, "streaming" | "active" | "sleeping">;
  userConfig: any;
  metadataStore: any;
}

export interface IMcpRegistry {
  getSessionMcpTools(username: string, sessionId: string, workspaceDir?: string): Promise<unknown[]>;
  loadMcpToolsForUserSession?(
    username: string,
    sessionId: string,
    workspaceDir: string,
  ): Promise<unknown[]>;
  stopAll(): void;
}

export interface IDelegationRegistry {
  onEvent(listener: (username: string, event: unknown) => void): () => void;
  register(username: string, parentSessionId: string, d: unknown, abortFn: () => void): void;
  complete(
    username: string,
    parentSessionId: string,
    toolCallId: string,
    status: unknown,
    result: unknown,
  ): void;
  getAll(username: string, parentSessionId: string): unknown[];
  getByToolCallId(username: string, parentSessionId: string, toolCallId: string): unknown;
  abortAllRecursive(rootSessionId: string): void;
  abortAll?(parentSessionId: string): void;
  abortAllForParentSession?(parentSessionId: string): void;
}

export interface IMemoryRegistry {
  shutdownAll(): Promise<void>;
}

export interface IUiApprovalRegistry {
  register(toolCallId: string, options?: unknown): Promise<unknown>;
  resolve(toolCallId: string, result: unknown): boolean;
  reject(toolCallId: string, error: unknown): boolean;
  cancelSession?(sessionId: string): number;
  getAll(username: string): any[];
}

export type { IApprovalManager, RequestApprovalParams } from "./approval-manager.port";
