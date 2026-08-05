// SPDX-License-Identifier: MIT
import type { AgentSessionEvent } from "../../ai/agent-session";
import type { ContextUsageResult } from "../../ai/context-estimator";
import type { IEventBus } from "./event-bus.port";

export interface IAgentRuntime {
  readonly sessionId: string;
  readonly cwd: string;
  readonly isStreaming: boolean;
  readonly events?: IEventBus<AgentSessionEvent>;
  readonly messages: any[];
  model?: any;
  resourceLoader?: any;
  sessionManager?: any;
  sessionStore?: any;
  authStorage?: any;
  modelRegistry?: any;
  customTools?: any[];

  prompt(message: string, opts?: { signal?: AbortSignal; images?: string[] }): Promise<void>;
  abort(): Promise<void>;
  dispose(): Promise<void>;
  getMessages(): unknown[];
  getContextUsage(): ContextUsageResult;

  on(handler: (event: AgentSessionEvent) => void): () => void;
  subscribe(handler: (event: any) => void): () => void;

  setModel(model: any): void;
  setThinkingLevel(level: any): void;
  steer(message: string): Promise<void> | void;
  followUp(message: string): Promise<void> | void;
  compact(): Promise<void>;
  getSessionStats(): any;
  getActiveToolNames(): string[];
  setActiveToolsByName(names: string[]): void;
  navigateTree(targetMessageId: string, options?: any): Promise<any>;
  addDelegationResult?(resultMessage: any): void;
  continue?(): Promise<void> | void;
}
