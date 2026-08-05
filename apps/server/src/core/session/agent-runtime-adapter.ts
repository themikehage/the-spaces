// SPDX-License-Identifier: MIT
import { TypedEventEmitter } from "../infra/event-bus";
import type { IAgentRuntime } from "../ports/agent-runtime.port";
import type { IEventBus } from "../ports/event-bus.port";
import type { IHookRunner } from "../ports/hook.port";
import type { IModelProvider } from "../ports/model.port";
import type { IPermissionEngine } from "../ports/permission.port";
import type { IPromptBuilder } from "../ports/prompt-builder.port";
import type { ISessionStore } from "../ports/session-store.port";
import type { IToolExecutor } from "../ports/tool-executor.port";
import type { AgentSessionEvent } from "./agent-session";
import type { ContextUsageResult } from "./context-estimator";

export interface AgentEngineAdapter {
  prompt(message: string, opts?: { signal?: AbortSignal; images?: string[] }): Promise<void>;
  abort(): Promise<void>;
  dispose?(): Promise<void>;
  getMessages(): unknown[];
  getContextUsage(): ContextUsageResult;
  on(handler: (event: AgentSessionEvent) => void): () => void;
  steer?(message: string): Promise<void>;
  followUp?(message: string): Promise<void>;
  compact?(): Promise<void>;
  getSessionStats?(): any;
  getActiveToolNames?(): string[];
  setActiveToolsByName?(names: string[]): void;
  navigateTree?(targetMessageId: string, editorText?: string): Promise<any>;
}

export interface AgentRuntimeDeps {
  sessionId: string;
  cwd: string;
  toolExecutor: IToolExecutor;
  promptBuilder?: IPromptBuilder;
  hookRunner?: IHookRunner;
  permissionEngine?: IPermissionEngine;
  sessionStore?: ISessionStore;
  modelProvider?: IModelProvider;
  engineAdapter?: AgentEngineAdapter;
}

export class AgentRuntime implements IAgentRuntime {
  readonly sessionId: string;
  readonly cwd: string;
  readonly events: IEventBus<AgentSessionEvent> = new TypedEventEmitter();
  model?: any;
  resourceLoader?: any;
  sessionManager?: any;
  modelProvider?: IModelProvider;

  private streaming = false;
  private abortController: AbortController | null = null;
  private toolExecutor: IToolExecutor;
  private engineAdapter?: AgentEngineAdapter;

  constructor(deps: AgentRuntimeDeps) {
    this.sessionId = deps.sessionId;
    this.cwd = deps.cwd;
    this.toolExecutor = deps.toolExecutor;
    this.engineAdapter = deps.engineAdapter;
    this.modelProvider = deps.modelProvider;

    if (this.engineAdapter) {
      this.engineAdapter.on((evt) => {
        this.events.emit(evt);
      });
    }
  }

  get isStreaming(): boolean {
    return this.streaming;
  }

  async prompt(message: string, opts?: { signal?: AbortSignal; images?: string[] }): Promise<void> {
    if (this.streaming) {
      throw new Error("Agent is already streaming");
    }

    this.abortController = opts?.signal ? null : new AbortController();
    const signal = opts?.signal ?? this.abortController?.signal;
    this.streaming = true;

    try {
      if (this.engineAdapter) {
        await this.engineAdapter.prompt(message, { signal, images: opts?.images });
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

  get messages(): unknown[] {
    return this.getMessages();
  }

  on(handler: (event: AgentSessionEvent) => void): () => void {
    return this.events.onAny(handler);
  }

  subscribe(handler: (event: AgentSessionEvent) => void): () => void {
    return this.on(handler);
  }

  setModel(model: any): void {
    this.model = model;
  }

  setThinkingLevel(_level: any): void {}

  async steer(message: string): Promise<void> {
    if (this.engineAdapter?.steer) {
      await this.engineAdapter.steer(message);
    } else {
      await this.prompt(message);
    }
  }

  async followUp(message: string): Promise<void> {
    if (this.engineAdapter?.followUp) {
      await this.engineAdapter.followUp(message);
    } else {
      await this.prompt(message);
    }
  }

  async compact(): Promise<void> {
    if (this.engineAdapter?.compact) {
      await this.engineAdapter.compact();
    }
  }

  getSessionStats(): any {
    return (
      this.engineAdapter?.getSessionStats?.() ?? {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
      }
    );
  }

  getActiveToolNames(): string[] {
    if (this.engineAdapter?.getActiveToolNames) {
      return this.engineAdapter.getActiveToolNames();
    }
    return this.toolExecutor
      .getRegistry()
      .getActive()
      .map((t) => t.name);
  }

  setActiveToolsByName(names: string[]): void {
    if (this.engineAdapter?.setActiveToolsByName) {
      this.engineAdapter.setActiveToolsByName(names);
    }
  }

  async navigateTree(targetMessageId: string, options?: any): Promise<any> {
    if (this.engineAdapter?.navigateTree) {
      return await this.engineAdapter.navigateTree(targetMessageId, options);
    }
    return undefined;
  }
}
