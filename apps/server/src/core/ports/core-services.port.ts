// SPDX-License-Identifier: MIT
import type { AgentSession } from "../../ai";

export interface SessionOverrides {
  model?: { provider: string; modelId: string };
  resourceLoader?: any;
  customTools?: any[];
  workspaceDir?: string;
  skipMcpTools?: boolean;
  skipMemory?: boolean;
}

export interface ISessionManager {
  getOrCreateSession(
    username: string,
    sessionId: string,
    projectId?: string,
    agentId?: string,
    overrides?: SessionOverrides,
  ): Promise<AgentSession>;
  destroySession(username: string, sessionId: string): Promise<void>;
}

export interface IMcpRegistry {
  getSessionMcpTools(username: string, sessionId: string, workspaceDir?: string): Promise<any[]>;
  loadMcpToolsForUserSession?(
    username: string,
    sessionId: string,
    workspaceDir: string,
  ): Promise<any[]>;
  stopAll(): void;
}

export interface IDelegationRegistry {
  onEvent(listener: (username: string, event: any) => void): () => void;
  register(username: string, parentSessionId: string, d: any, abortFn: () => void): void;
  complete(
    username: string,
    parentSessionId: string,
    toolCallId: string,
    status: any,
    result: any,
  ): void;
  getAll(username: string, parentSessionId: string): any[];
  getByToolCallId(username: string, parentSessionId: string, toolCallId: string): any;
  abortAllRecursive(rootSessionId: string): void;
  abortAll?(parentSessionId: string): void;
}

export interface IMemoryRegistry {
  shutdownAll(): Promise<void>;
}

export interface IUiApprovalRegistry {
  register(toolCallId: string): Promise<any>;
  resolve(toolCallId: string, result: any): boolean;
  reject(toolCallId: string, error: any): boolean;
}
