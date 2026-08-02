import type {
  AgentContext,
  AgentEvent,
  AgentMessage,
  AgentRuntimeDependencies,
  ContextUsage,
  IAgentRuntime,
  IEventBus,
  LLMMessage,
  ToolCall,
} from "@spaces/core";
import { runAgentLoop } from "./agent-loop.js";
import { EventBus } from "./event-bus.js";

export class AgentRuntime implements IAgentRuntime {
  readonly id: string;
  readonly events: IEventBus<AgentEvent> = new EventBus<AgentEvent>();

  private deps: AgentRuntimeDependencies;
  private abortController: AbortController | null = null;
  private streaming = false;

  constructor(id: string, deps: AgentRuntimeDependencies) {
    this.id = id;
    this.deps = deps;
  }

  async prompt(input: string, opts?: { metadata?: Record<string, unknown> }): Promise<void> {
    if (this.streaming) {
      throw new Error(`Agent ${this.id} is already streaming.`);
    }

    this.abortController = new AbortController();
    this.streaming = true;
    this.events.emit({ type: "agent_start" });

    try {
      const userMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: input,
        createdAt: new Date().toISOString(),
      };

      await this.deps.sessionStore.appendMessage(this.id, userMessage);
      this.events.emit({ type: "message_start", message: userMessage });
      this.events.emit({ type: "message_end", message: userMessage });

      const history = await this.deps.sessionStore.getMessages(this.id);
      const agentContext: AgentContext = {
        sessionId: this.id,
        messages: history,
        metadata: opts?.metadata,
      };

      const systemPrompt = await this.deps.promptBuilder.build(agentContext);
      const llmMessages: LLMMessage[] = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const toolDefs = this.deps.toolExecutor.getRegistry().toLLMFormat();

      await runAgentLoop({
        modelProvider: this.deps.modelProvider,
        messages: llmMessages,
        tools: toolDefs,
        systemPrompt,
        signal: this.abortController.signal,
        onMessageStart: (msg) => {
          this.events.emit({ type: "message_start", message: msg });
        },
        onMessageUpdate: (msg, delta) => {
          this.events.emit({ type: "message_update", message: msg, delta });
        },
        onMessageEnd: async (msg) => {
          await this.deps.sessionStore.appendMessage(this.id, msg);
          this.events.emit({ type: "message_end", message: msg });
        },
        onToolCall: async (toolCall: ToolCall) => {
          this.events.emit({ type: "tool_execution_start", toolCall });
          const result = await this.deps.toolExecutor.execute(toolCall, {
            sessionId: this.id,
            agentId: this.id,
          });
          this.events.emit({ type: "tool_execution_end", toolCall, result });
          return result;
        },
      });

      const finalHistory = await this.deps.sessionStore.getMessages(this.id);
      this.events.emit({ type: "agent_end", messages: finalHistory });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.deps.hookRunner.runOnError(err instanceof Error ? err : new Error(errorMsg));
      this.events.emit({ type: "agent_error", error: errorMsg });
    } finally {
      this.streaming = false;
      this.abortController = null;
    }
  }

  async abort(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async dispose(): Promise<void> {
    await this.abort();
    this.events.clear();
  }

  async getMessages(): Promise<AgentMessage[]> {
    return this.deps.sessionStore.getMessages(this.id);
  }

  getContextUsage(): ContextUsage {
    return {
      used: 0,
      total: 128000,
      percentage: 0,
    };
  }
}
