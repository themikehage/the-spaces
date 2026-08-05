// SPDX-License-Identifier: MIT
import { TypedEventEmitter } from "../core/event-bus";
import type { IAgentRuntime } from "../core/ports/agent-runtime.port";
import type { IEventBus } from "../core/ports/event-bus.port";
import type { IHookRunner } from "../core/ports/hook.port";
import type { IPermissionEngine } from "../core/ports/permission.port";
import type { IPromptBuilder } from "../core/ports/prompt-builder.port";
import type { ISessionStore } from "../core/ports/session-store.port";
import type { IToolExecutor } from "../core/ports/tool-executor.port";
import type { AgentSessionEvent } from "./agent-session";
import type { ContextUsageResult } from "./context-estimator";

export interface AgentEngineAdapter {
  prompt(message: string, opts?: { signal?: AbortSignal }): Promise<void>;
  abort(): Promise<void>;
  dispose?(): Promise<void>;
  getMessages(): unknown[];
  getContextUsage(): ContextUsageResult;
  on(handler: (event: AgentSessionEvent) => void): () => void;
}

export interface AgentRuntimeDeps {
  sessionId: string;
  cwd: string;
  toolExecutor: IToolExecutor;
  promptBuilder?: IPromptBuilder;
  hookRunner?: IHookRunner;
  permissionEngine?: IPermissionEngine;
  sessionStore?: ISessionStore;
  engineAdapter?: AgentEngineAdapter;
}

export class AgentRuntime implements IAgentRuntime {
  readonly sessionId: string;
  readonly cwd: string;
  readonly events: IEventBus<AgentSessionEvent> = new TypedEventEmitter();

  private streaming = false;
  private abortController: AbortController | null = null;
  private engineAdapter?: AgentEngineAdapter;

  constructor(deps: AgentRuntimeDeps) {
    this.sessionId = deps.sessionId;
    this.cwd = deps.cwd;
    this.engineAdapter = deps.engineAdapter;

    if (this.engineAdapter) {
      this.engineAdapter.on((evt) => {
        this.events.emit(evt);
      });
    }
  }

  get isStreaming(): boolean {
    return this.streaming;
  }

  async prompt(message: string, opts?: { signal?: AbortSignal }): Promise<void> {
    if (this.streaming) {
      throw new Error("Agent is already streaming");
    }

    this.abortController = opts?.signal ? null : new AbortController();
    const signal = opts?.signal ?? this.abortController?.signal;
    this.streaming = true;

    try {
      if (this.engineAdapter) {
        await this.engineAdapter.prompt(message, { signal });
      }
    } finally {
      this.streaming = false;
    }
  }

  async abort(): Promise<void> {
    this.abortController?.abort();
    if (this.engineAdapter) {
      await this.engineAdapter.abort();
    }
    this.streaming = false;
  }

  async dispose(): Promise<void> {
    await this.abort();
    this.events.clear();
    if (this.engineAdapter?.dispose) {
      await this.engineAdapter.dispose();
    }
  }

  getMessages(): unknown[] {
    return this.engineAdapter?.getMessages() ?? [];
  }

  getContextUsage(): ContextUsageResult {
    return (
      this.engineAdapter?.getContextUsage() ?? {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        limit: null,
      }
    );
  }

  on(handler: (event: AgentSessionEvent) => void): () => void {
    return this.events.onAny(handler);
  }
}
