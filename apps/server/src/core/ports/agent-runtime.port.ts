// SPDX-License-Identifier: MIT
import type { AgentSessionEvent } from "../../ai/agent-session";
import type { ContextUsageResult } from "../../ai/context-estimator";
import type { IEventBus } from "./event-bus.port";

export interface IAgentRuntime {
  readonly sessionId: string;
  readonly cwd: string;
  readonly isStreaming: boolean;
  readonly events?: IEventBus<any>;

  prompt(message: string, opts?: { signal?: AbortSignal }): Promise<void>;
  abort(): Promise<void>;
  dispose?(): Promise<void>;
  getMessages(): unknown[];
  getContextUsage(): ContextUsageResult;

  on(handler: (event: AgentSessionEvent) => void): () => void;
}
