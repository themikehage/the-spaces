// SPDX-License-Identifier: MIT
import type { AgentSessionEvent } from "../../ai/agent-session";
import type { ContextUsageResult } from "../../ai/context-estimator";

export interface IAgentRuntime {
  readonly sessionId: string;
  readonly cwd: string;
  readonly isStreaming: boolean;

  prompt(message: string, opts?: { signal?: AbortSignal }): Promise<void>;
  abort(): Promise<void>;
  getMessages(): unknown[];
  getContextUsage(): ContextUsageResult;

  on(handler: (event: AgentSessionEvent) => void): () => void;
}
