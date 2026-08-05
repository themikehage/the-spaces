import type {
  IAgentRuntime,
  IEventBus,
  IHookRunner,
  IModelProvider,
  IPermissionEngine,
  IPromptBuilder,
  ISessionStore,
  IToolExecutor,
  AgentMessage,
  AgentContext,
  ContextUsage,
  PromptOptions,
} from "@auto-browser/core";

import { runAgentLoop } from "./vendor/agent/src/agent-loop.ts";
import { registerBuiltInApiProviders } from "./vendor/ai/src/compat.ts";
import { toVendorAgentTool } from "./tool-adapter.ts";
import { EventBus } from "./event-bus.ts";

export interface AgentRuntimeDeps {
  modelProvider: IModelProvider;
  toolExecutor: IToolExecutor;
  promptBuilder: IPromptBuilder;
  hookRunner: IHookRunner;
  permissionEngine: IPermissionEngine;
  sessionStore: ISessionStore;
}

export class AgentRuntime implements IAgentRuntime {
  readonly id: string;
  readonly events: IEventBus;

  private deps: AgentRuntimeDeps;
  private messages: AgentMessage[] = [];
  private abortController: AbortController | null = null;
  private streaming = false;

  constructor(id: string, deps: AgentRuntimeDeps, events?: IEventBus) {
    this.id = id;
    this.deps = deps;
    this.events = events ?? new EventBus();
  }

  async initialize(): Promise<void> {
    this.messages = await this.deps.sessionStore.getMessages(this.id);
  }

  async prompt(input: string, opts?: PromptOptions): Promise<void> {
    if (this.streaming) {
      throw new Error("Agent is already streaming");
    }

    registerBuiltInApiProviders();

    this.abortController = new AbortController();
    if (opts?.signal) {
      opts.signal.addEventListener("abort", () => this.abortController?.abort());
    }

    this.streaming = true;
    this.events.emit({ type: "agent_start" });

    try {
      const userMsg: AgentMessage = {
        role: "user",
        content: [{ type: "text", text: input }],
        timestamp: Date.now(),
      };

      this.messages.push(userMsg);
      await this.deps.sessionStore.appendMessage(this.id, userMsg);

      const promptCtx = { sessionId: this.id, messages: this.messages };
      const systemPrompt = await this.deps.promptBuilder.build(promptCtx);

      const vendorTools = this.deps.toolExecutor.registry
        .toAgentTools()
        .map((t) => toVendorAgentTool(t, this.id));

      const agentContext = {
        systemPrompt,
        messages: this.messages as any[],
        tools: vendorTools,
      };

      const model = this.deps.modelProvider.createModel() as any;

      await runAgentLoop(
        [userMsg as any],
        agentContext,
        {
          model,
          apiKey: this.deps.modelProvider.getApiKey?.() ?? "",
          getApiKey: async () => this.deps.modelProvider.getApiKey?.() ?? "",
          convertToLlm: (msgs) => msgs as any[],
          beforeToolCall: async (ctx) => {
            const ruleCtx = {
              sessionId: this.id,
              toolName: ctx.toolCall.name,
              args: ctx.args,
            };
            const perm = await this.deps.permissionEngine.evaluate(ruleCtx);
            if (!perm.allowed) {
              return { block: true, reason: perm.reason };
            }

            const hookCtx = {
              sessionId: this.id,
              toolCallId: ctx.toolCall.id,
              toolName: ctx.toolCall.name,
              args: ctx.args,
              signal: this.abortController?.signal,
            };
            const result = await this.deps.hookRunner.runBeforeToolCall(hookCtx);
            if (result === null) {
              return { block: true, reason: "Blocked by hook" };
            }
            return undefined;
          },
          afterToolCall: async (ctx) => {
            const hookCtx = {
              sessionId: this.id,
              toolCallId: ctx.toolCall.id,
              toolName: ctx.toolCall.name,
              args: ctx.args,
              signal: this.abortController?.signal,
            };
            await this.deps.hookRunner.runAfterToolCall(hookCtx, {
              content: ctx.result.content as any[],
              details: ctx.result.details,
            });
            return undefined;
          },
        },
        async (event) => {
          this.events.emit(event as any);

          if (event.type === "message_end") {
            const msg = event.message as AgentMessage;
            if (msg.role !== "user") {
              this.messages.push(msg);
              await this.deps.sessionStore.appendMessage(this.id, msg);
            }
          }
        },
        this.abortController.signal,
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("[AgentRuntime] Prompt execution error:", error);
      await this.deps.hookRunner.runOnError(error);
      this.events.emit({ type: "agent_error", error: error.message });
      this.events.emit({ type: "agent_end", messages: this.messages });
    } finally {
      this.streaming = false;
    }
  }

  async abort(): Promise<void> {
    this.abortController?.abort();
  }

  async dispose(): Promise<void> {
    await this.abort();
    this.events.clear();
  }

  getMessages(): AgentMessage[] {
    return [...this.messages];
  }

  getContext(): AgentContext {
    return {
      sessionId: this.id,
      systemPrompt: "",
      messages: this.messages,
    };
  }

  getContextUsage(): ContextUsage {
    return { used: 0, total: 0 };
  }
}
