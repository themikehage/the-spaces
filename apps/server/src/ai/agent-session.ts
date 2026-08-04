import type { BaseTool } from "shared";
import { TypedEventEmitter } from "../core/event-bus";
import { HookRunner } from "../core/hook-runner";
import { NavigationController } from "../core/navigation-controller";
import type { IAgentRuntime } from "../core/ports/agent-runtime.port";
import type { IEventBus } from "../core/ports/event-bus.port";
import type { Hook, IHookRunner } from "../core/ports/hook.port";
import type { IPromptBuilder } from "../core/ports/prompt-builder.port";
import type { ITool } from "../core/ports/tool.port";
import { ToolRegistry } from "../core/tool-registry";
import type { AuthStorage } from "./auth-storage.ts";
import { CompactionManager } from "./compaction-manager";
import { estimateContextUsage as estimateContextUsageHelper } from "./context-estimator";
import { convertToLlm } from "./messages";
import type { AvailableModel, ModelRegistry } from "./model-registry";
import { PromptBuilder } from "./prompt-builder";
import type { DefaultResourceLoader } from "./resource-loader";
import type { JsonlSessionStore } from "./session-persistence";
import { Agent } from "./vendor/agent/src/agent.ts";
import { formatSkillsForSystemPrompt } from "./vendor/agent/src/harness/system-prompt.ts";
import type {
  AgentMessage,
  AgentTool,
  BeforeToolCallContext,
  BeforeToolCallResult,
} from "./vendor/agent/src/types.ts";
import { streamSimple } from "./vendor/ai/src/compat.ts";

export interface CreateAgentSessionOptions {
  cwd: string;
  sessionStore?: JsonlSessionStore;
  sessionManager?: JsonlSessionStore;
  authStorage: AuthStorage;
  modelRegistry: ModelRegistry;
  resourceLoader: DefaultResourceLoader;
  customTools?: BaseTool[] | any[];
  beforeToolCall?: (
    context: BeforeToolCallContext,
    signal?: AbortSignal,
  ) => Promise<BeforeToolCallResult | undefined>;
  afterToolCall?: (context: any) => Promise<void> | void;
  delegationRegistry?: any;
}

export type AgentSessionEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: AgentMessage[]; willRetry: boolean }
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_end"; message: AgentMessage }
  | { type: "message_update"; assistantMessageEvent: any; message: AgentMessage }
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

export class AgentSession implements IAgentRuntime {
  cwd: string;
  get sessionId(): string {
    return this.sessionStore?.getSessionId() || "";
  }
  sessionStore: JsonlSessionStore;
  get sessionManager(): JsonlSessionStore {
    return this.sessionStore;
  }
  authStorage: AuthStorage;
  modelRegistry: ModelRegistry;
  resourceLoader: DefaultResourceLoader;
  customTools: any[];
  _customTools: any[];
  beforeToolCall?: (
    context: BeforeToolCallContext,
    signal?: AbortSignal,
  ) => Promise<BeforeToolCallResult | undefined>;
  afterToolCall?: (context: any) => Promise<void> | void;
  delegationRegistry?: any;

  model: AvailableModel | null = null;

  private agent!: Agent;
  private eventBus: IEventBus = new TypedEventEmitter();
  private toolRegistry = new ToolRegistry();
  private promptBuilder!: IPromptBuilder;
  private compactionManager!: CompactionManager;
  private navigationController!: NavigationController;
  private hookRunner: IHookRunner = new HookRunner();
  private activeSkillPrompts: string[] = [];
  private abortController: AbortController | null = null;

  registerHook(hook: Hook): void {
    this.hookRunner.register(hook);
  }

  unregisterHook(hookId: string): void {
    this.hookRunner.unregister(hookId);
  }

  get activeTools(): AgentTool[] {
    return this.toolRegistry.toAgentTools(this.sessionId);
  }
  set activeTools(tools: (AgentTool | ITool)[]) {
    this.toolRegistry.setActiveTools(tools as any);
  }

  get allToolsMap(): Map<string, AgentTool> {
    const map = new Map<string, AgentTool>();
    for (const tool of this.toolRegistry.toAgentTools(this.sessionId)) {
      map.set(tool.name, tool);
    }
    return map;
  }

  get messages(): any[] {
    return this.agent?.state?.messages || [];
  }
  set messages(val: any[]) {
    if (this.agent?.state) {
      this.agent.state.messages = val;
    }
  }

  get thinkingLevel(): string {
    return this.agent?.state?.thinkingLevel || "off";
  }
  set thinkingLevel(val: string) {
    if (this.agent?.state) {
      (this.agent.state as any).thinkingLevel = val as any;
    }
  }

  get isStreaming(): boolean {
    return this.agent?.state?.isStreaming || false;
  }
  set isStreaming(val: boolean) {
    if (this.agent?.state) {
      (this.agent.state as any).isStreaming = val;
    }
  }

  addDelegationResult(resultMessage: AgentMessage): void {
    this.agent.followUp(resultMessage);
  }

  constructor(options: CreateAgentSessionOptions) {
    this.cwd = options.cwd;
    this.sessionStore = (options.sessionStore ?? options.sessionManager)!;
    this.authStorage = options.authStorage;
    this.modelRegistry = options.modelRegistry;
    this.resourceLoader = options.resourceLoader;
    this.customTools = options.customTools || [];
    this._customTools = this.customTools;
    this.beforeToolCall = options.beforeToolCall;
    this.afterToolCall = options.afterToolCall;
    this.delegationRegistry = options.delegationRegistry;

    if (options.beforeToolCall || options.afterToolCall) {
      this.hookRunner.register({
        id: "options-legacy-hook",
        priority: 100,
        beforeToolCall: options.beforeToolCall,
        afterToolCall: options.afterToolCall
          ? (ctx, sig) => options.afterToolCall!(ctx) as any
          : undefined,
      });
    }

    this.promptBuilder = new PromptBuilder(this.resourceLoader);
    this.compactionManager = new CompactionManager(this.sessionStore, this.modelRegistry);
    this.navigationController = new NavigationController(
      this.sessionStore,
      this.delegationRegistry,
    );

    this.initializeTools();
    this.restoreSessionState();
    this.initializeAgent();
  }

  private injectedMemoryContext: string | null = null;

  injectMemoryContext(memCtx: string): void {
    if (memCtx) {
      this.injectedMemoryContext = memCtx;
    }
  }

  _refreshToolRegistry(): void {
    const prevActiveNames = this.activeTools?.length
      ? this.activeTools.map((t: any) => t.name)
      : null;
    this.toolRegistry.clear();
    for (const toolDef of this.customTools) {
      if (!toolDef) continue;
      const name = toolDef.name || toolDef.declaration?.name || "unnamed";
      const description = toolDef.description || toolDef.declaration?.description || "";
      const parameters =
        toolDef.parameters ||
        toolDef.schema ||
        toolDef.declaration?.parameters ||
        toolDef.declaration?.schema ||
        {};
      const label = toolDef.label || name;

      const wrappedTool: AgentTool = {
        name,
        label,
        description,
        parameters,
        execute: async (toolCallId, params, signal, onUpdate) => {
          let res: any;
          if (typeof toolDef.execute === "function") {
            if (toolDef.execute.length === 1) {
              res = await toolDef.execute(params, signal);
            } else if (toolDef.execute.length === 0) {
              res = await toolDef.execute();
            } else {
              res = await toolDef.execute(toolCallId, params, signal, onUpdate);
            }
          } else {
            res = "";
          }

          if (res && typeof res === "object" && "content" in res && Array.isArray(res.content)) {
            return res;
          }
          if (typeof res === "string") {
            return {
              content: [{ type: "text", text: res }],
              details: { output: res },
            };
          }
          if (res && typeof res === "object" && typeof res.content === "string") {
            return {
              content: [{ type: "text", text: res.content }],
              details: res,
            };
          }
          const outputText =
            res && typeof res === "object" && "output" in res
              ? String(res.output)
              : JSON.stringify(res);
          return {
            content: [{ type: "text", text: outputText }],
            details: res,
          };
        },
      };
      this.toolRegistry.registerTool(wrappedTool);
    }

    if (prevActiveNames && prevActiveNames.length > 0) {
      const prevSet = new Set(prevActiveNames);
      const allTools = this.toolRegistry.getAllTools();
      const allNames = allTools.map((t) => t.name);
      const newNames = allNames.filter((n) => !prevSet.has(n));
      const activeNames = [...prevActiveNames, ...newNames];
      const active = activeNames
        .map((name) => this.toolRegistry.getTool(name))
        .filter(Boolean) as ITool[];
      if (active.length > 0) {
        this.activeTools = active;
      } else {
        this.activeTools = allTools;
      }
    } else {
      this.activeTools = this.toolRegistry.getAllTools();
    }

    if (this.agent) {
      (this.agent.state as any).tools = this.activeTools;
    }
  }

  private initializeTools() {
    this._refreshToolRegistry();
  }

  private restoreSessionState() {
    const context = this.sessionManager.buildSessionContext();
    const loadedThinkingLevel = context.thinkingLevel || "off";

    if (context.model) {
      const found = this.modelRegistry.find(context.model.provider, context.model.modelId);
      if (found) {
        this.model = found;
      }
    }

    if (!this.model) {
      const available = this.modelRegistry.getAvailable();
      if (available.length > 0) {
        this.model = available[0];
      }
    }

    this.thinkingLevel = loadedThinkingLevel;
  }

  private initializeAgent() {
    const skills = this.resourceLoader.getSkills().skills;
    const availableSkillsPrompt = formatSkillsForSystemPrompt(skills as any);

    const systemPrompt = [
      this.resourceLoader.getSystemPrompt() || "",
      ...(this.resourceLoader.getAppendSystemPrompt() || []),
      availableSkillsPrompt,
      ...this.activeSkillPrompts,
    ]
      .filter(Boolean)
      .join("\n\n");

    if (this.model && !this.model.contextWindow) {
      throw new Error(
        `Model ${this.model.id} missing contextWindow - fetch mandatory, run POST /api/providers/${this.model.provider}/refresh`,
      );
    }
    const modelObj = this.model
      ? {
          id: this.model.id,
          name: this.model.name,
          provider: this.model.provider,
          api: this.model.api,
          baseUrl: this.model.baseUrl,
          apiKey: this.model.apiKey,
          reasoning: !!this.model.reasoning,
          contextWindow: this.model.contextWindow!,
          maxTokens: this.model.maxTokens ?? 0,
          compat: this.model.compat,
          input: (this.model as any).input || [],
          cost: (this.model as any).cost || {},
        }
      : {
          id: "unknown",
          name: "unknown",
          provider: "unknown",
          api: "unknown",
          baseUrl: "",
          reasoning: false,
          contextWindow: 0,
          maxTokens: 0,
          compat: undefined,
          input: [],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        };

    const initialMessages = this.sessionManager.buildSessionContext().messages;

    this.agent = new Agent({
      initialState: {
        systemPrompt,
        model: modelObj as any,
        thinkingLevel: this.thinkingLevel as any,
        tools: this.toolRegistry.toAgentTools(this.sessionId),
        messages: initialMessages,
      },
      convertToLlm,
      streamFn: streamSimple,
      getApiKey: async (providerName: string) => {
        const result = await this.modelRegistry.getApiKeyAndHeaders({
          provider: providerName,
          apiKey: this.model?.apiKey,
        } as any);
        return result.ok ? result.apiKey : undefined;
      },
      beforeToolCall: (ctx, signal) => this.hookRunner.runBeforeToolCall(ctx, signal),
      afterToolCall: (ctx) => this.hookRunner.runAfterToolCall(ctx as any),
      prepareNextTurn: async () => {
        try {
          const skills = this.resourceLoader.getSkills().skills;
          const availableSkillsPrompt = formatSkillsForSystemPrompt(skills as any);
          const freshSystemPrompt = [
            this.resourceLoader.getSystemPrompt() || "",
            ...(this.resourceLoader.getAppendSystemPrompt() || []),
            availableSkillsPrompt,
            ...this.activeSkillPrompts,
          ]
            .filter(Boolean)
            .join("\n\n");
          const freshMessages = this.sessionManager.buildSessionContext().messages;
          return {
            context: {
              systemPrompt: freshSystemPrompt,
              messages: freshMessages as any,
              tools: this.activeTools,
            },
          };
        } catch {
          return {
            context: {
              systemPrompt: this.agent?.state?.systemPrompt || "",
              messages: this.agent?.state?.messages || [],
              tools: this.activeTools,
            },
          };
        }
      },
    });

    this.agent.subscribe(async (evt) => {
      await this.handleAgentEvent(evt);
    });
  }

  private async handleAgentEvent(evt: any) {
    if (evt.type === "agent_start") {
      this.emit({ type: "agent_start" });
    } else if (evt.type === "agent_end") {
      for (const msg of evt.messages || []) {
        if (msg.role === "assistant" && msg.usage) {
          if (!msg.usage.cost) {
            msg.usage.cost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 };
          } else {
            const cost = msg.usage.cost;
            cost.input = cost.input ?? 0;
            cost.output = cost.output ?? 0;
            cost.cacheRead = cost.cacheRead ?? 0;
            cost.cacheWrite = cost.cacheWrite ?? 0;
            cost.total = cost.total ?? 0;
          }
        }
      }
      this.emit({ type: "agent_end", messages: evt.messages, willRetry: false });
    } else if (evt.type === "message_start") {
      this.emit({
        type: "message_start",
        message: evt.message,
      });
    } else if (evt.type === "message_end") {
      if (evt.message) {
        this.sessionManager.appendMessage(evt.message);
        if (evt.message.role === "assistant" && evt.message.stopReason === "error") {
          console.warn(
            `[AgentSession API Error] Session ${this.sessionManager.getSessionId()}:`,
            evt.message.errorMessage || "API error response",
          );
          this.emit({
            type: "agent_error",
            error: evt.message.errorMessage || "API error response",
          });
        }
      }
      this.emit({
        type: "message_end",
        message: evt.message,
      });
    } else if (evt.type === "message_update") {
      if (
        evt.assistantMessageEvent?.type === "text_delta" ||
        evt.assistantMessageEvent?.type === "thinking_delta"
      ) {
        this.emit({
          type: "message_update",
          assistantMessageEvent: evt.assistantMessageEvent,
          message: evt.message,
        });
      }
    } else if (evt.type === "tool_execution_start") {
      this.emit({
        type: "tool_execution_start",
        toolName: evt.toolName,
        args: evt.args,
        toolCallId: evt.toolCallId,
        toolCall: {
          id: evt.toolCallId,
          name: evt.toolName,
          arguments: evt.args,
        },
      });
    } else if (evt.type === "tool_execution_end") {
      this.emit({
        type: "tool_execution_end",
        toolName: evt.toolName,
        result: evt.result,
        isError: evt.isError,
        toolCallId: evt.toolCallId,
        toolCall: {
          id: evt.toolCallId,
          name: evt.toolName,
        },
      });
    } else if (evt.type === "tool_execution_update") {
      this.emit({
        type: "tool_execution_update",
        toolCallId: evt.toolCallId,
        toolName: evt.toolName,
        partialResult: evt.partialResult,
      });
    } else if (evt.type === "turn_end") {
      if (evt.message && evt.message.role === "assistant" && evt.message.errorMessage) {
        console.warn(
          `[AgentSession API Error] Session ${this.sessionManager.getSessionId()}:`,
          evt.message.errorMessage,
        );
        this.emit({ type: "agent_error", error: evt.message.errorMessage });
      }
    }
  }

  setActiveToolsByName(names: string[]): void {
    const list: ITool[] = [];
    for (const name of names) {
      const tool = this.toolRegistry.getTool(name);
      if (tool) list.push(tool);
    }
    this.activeTools = list as any;
    if (this.agent) {
      (this.agent.state as any).tools = this.toolRegistry.toAgentTools(this.sessionId);
    }
  }

  getActiveToolNames(): string[] {
    return this.activeTools.map((t) => t.name);
  }

  async setModel(model: AvailableModel): Promise<void> {
    this.model = model;
    this.sessionManager.appendModelChange(model.provider, model.id);
    if (!model.contextWindow) {
      throw new Error(
        `Model ${model.id} missing contextWindow - fetch mandatory, run POST /api/providers/${model.provider}/refresh`,
      );
    }
    if (this.agent) {
      (this.agent.state as any).model = {
        id: model.id,
        name: model.name,
        provider: model.provider,
        api: model.api,
        baseUrl: model.baseUrl,
        apiKey: model.apiKey,
        reasoning: !!model.reasoning,
        contextWindow: model.contextWindow!,
        maxTokens: model.maxTokens ?? 0,
        compat: model.compat,
        input: (model as any).input || [],
        cost: (model as any).cost || {},
      };
    }
  }

  setThinkingLevel(level: string): void {
    this.thinkingLevel = level;
    this.sessionManager.appendThinkingLevelChange(level);
  }

  subscribe(listener: (evt: any) => void): () => void {
    return this.eventBus.onAny(listener);
  }

  on(handler: (event: AgentSessionEvent) => void): () => void {
    return this.eventBus.onAny(handler);
  }

  getMessages(): any[] {
    return this.messages;
  }

  private emit(event: any) {
    this.eventBus.emit(event);
  }

  async prompt(messageText: string, opts?: any): Promise<any> {
    if (this.isStreaming) {
      throw new Error("Session is already streaming");
    }

    this.abortController = new AbortController();
    this.isStreaming = true;

    try {
      // Load matching skills content
      const availableSkills = this.resourceLoader.getSkills().skills;
      const matchedSkills = [];
      const matches = [...messageText.matchAll(/(?:^|\s)\/([a-zA-Z0-9_-]+)/g)];
      const uniqueNames = new Set(matches.map((m) => m[1].toLowerCase()));

      for (const name of uniqueNames) {
        const skill = availableSkills.find((s) => s.name.toLowerCase() === name);
        if (skill) {
          matchedSkills.push(skill);
        }
      }

      const skillPrompts: string[] = [];
      for (const skill of matchedSkills) {
        if (skill.content) {
          skillPrompts.push(`=== Active Skill Instructions: ${skill.name} ===\n${skill.content}`);
        }
      }
      this.activeSkillPrompts = skillPrompts;

      const contentParts: any[] = [{ type: "text" as const, text: messageText }];
      if (opts?.images && Array.isArray(opts.images)) {
        for (const img of opts.images) {
          let base64Part = img.data || "";
          if (base64Part.includes("base64,")) {
            base64Part = base64Part.substring(base64Part.indexOf("base64,") + 7);
          }
          contentParts.push({
            type: "image" as const,
            mimeType: img.mimeType || "image/png",
            data: base64Part,
          });
        }
      }

      const userMessage = {
        role: "user" as const,
        content: contentParts.length > 1 ? contentParts : messageText,
        timestamp: Date.now(),
      };

      if (!this.model) {
        throw new Error(
          "No AI model assigned to session. Please configure an AI provider or select a model.",
        );
      }
      if (!this.model.contextWindow) {
        throw new Error(
          `Model ${this.model.id} missing contextWindow - fetch mandatory, run POST /api/providers/${this.model.provider}/refresh`,
        );
      }
      if (this.model) {
        const modelObj = {
          id: this.model.id,
          name: this.model.name,
          provider: this.model.provider,
          api: this.model.api,
          baseUrl: this.model.baseUrl,
          apiKey: this.model.apiKey,
          reasoning: !!this.model.reasoning,
          contextWindow: this.model.contextWindow!,
          maxTokens: this.model.maxTokens ?? 0,
          compat: this.model.compat,
          input: (this.model as any).input || [],
          cost: (this.model as any).cost || {},
        };
        (this.agent.state as any).model = modelObj;
      }

      const skills = this.resourceLoader.getSkills().skills;
      const availableSkillsPrompt = formatSkillsForSystemPrompt(skills as any);
      let systemPrompt = [
        this.resourceLoader.getSystemPrompt() || "",
        ...(this.resourceLoader.getAppendSystemPrompt() || []),
        availableSkillsPrompt,
        ...this.activeSkillPrompts,
      ]
        .filter(Boolean)
        .join("\n\n");

      if (this.injectedMemoryContext) {
        systemPrompt += `\n\n## Auto-Recalled Memory Context:\n${this.injectedMemoryContext}`;
        this.injectedMemoryContext = null;
      }
      (this.agent.state as any).systemPrompt = systemPrompt;

      const currentMessages = this.sessionManager.buildSessionContext().messages;
      (this.agent.state as any).messages = currentMessages;

      await this.agent.prompt(userMessage as any);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err ?? "Unknown error");
      this.handleSessionError(errorMsg);
    } finally {
      this.isStreaming = false;
      this.abortController = null;
      if (this.agent?.hasQueuedMessages()) {
        setTimeout(() => {
          if (!this.isStreaming && this.agent?.hasQueuedMessages()) {
            this.continue().catch((e) => {
              console.error("[AgentSession] Auto-continue on queued messages failed:", e);
            });
          }
        }, 50);
      }
    }
  }

  async continue(): Promise<any> {
    if (this.isStreaming) {
      throw new Error("Session is already streaming");
    }

    this.abortController = new AbortController();
    this.isStreaming = true;

    try {
      if (this.model) {
        if (!this.model.contextWindow) {
          throw new Error(
            `Model ${this.model.id} missing contextWindow - fetch mandatory, run POST /api/providers/${this.model.provider}/refresh`,
          );
        }
        const modelObj = {
          id: this.model.id,
          name: this.model.name,
          provider: this.model.provider,
          api: this.model.api,
          baseUrl: this.model.baseUrl,
          apiKey: this.model.apiKey,
          reasoning: !!this.model.reasoning,
          contextWindow: this.model.contextWindow!,
          maxTokens: this.model.maxTokens ?? 0,
          compat: this.model.compat,
          input: (this.model as any).input || [],
          cost: (this.model as any).cost || {},
        };
        (this.agent.state as any).model = modelObj;
      }

      const skills = this.resourceLoader.getSkills().skills;
      const availableSkillsPrompt = formatSkillsForSystemPrompt(skills as any);
      const systemPrompt = [
        this.resourceLoader.getSystemPrompt() || "",
        ...(this.resourceLoader.getAppendSystemPrompt() || []),
        availableSkillsPrompt,
        ...this.activeSkillPrompts,
      ]
        .filter(Boolean)
        .join("\n\n");
      (this.agent.state as any).systemPrompt = systemPrompt;

      const currentMessages = this.sessionManager.buildSessionContext().messages;
      (this.agent.state as any).messages = currentMessages;

      await this.agent.continue();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err ?? "Unknown error");
      this.handleSessionError(errorMsg);
    } finally {
      this.isStreaming = false;
      this.abortController = null;
      if (this.agent?.hasQueuedMessages()) {
        setTimeout(() => {
          if (!this.isStreaming && this.agent?.hasQueuedMessages()) {
            this.continue().catch((e) => {
              console.error("[AgentSession] Auto-continue on queued messages failed:", e);
            });
          }
        }, 50);
      }
    }
  }

  steer(messageText: string): void {
    this.navigationController.steer(this.agent, messageText);
  }

  followUp(messageText: string): void {
    this.navigationController.followUp(this.agent, messageText);
  }

  async abort(): Promise<void> {
    await this.navigationController.abort(this.agent, this.abortController);
  }

  async compact(customInstructions?: string): Promise<void> {
    if (this.isStreaming) {
      throw new Error("Cannot compact while session is streaming");
    }
    const result = await this.compactionManager.compactSession(
      this.model,
      this.thinkingLevel,
      customInstructions,
    );
    if (result) {
      this.messages = this.sessionManager.buildSessionContext().messages;
    }
  }

  async navigateTree(
    targetId: string,
    options?: { summarize?: boolean },
  ): Promise<{ editorText: string }> {
    if (this.isStreaming) {
      throw new Error("Cannot navigate while session is streaming");
    }
    this.sessionManager.branch(targetId);
    this.messages = this.sessionManager.buildSessionContext().messages;
    if (this.agent) {
      this.agent.state.messages = this.messages;
    }
    return { editorText: "" };
  }

  getContextUsage() {
    const context = this.sessionManager.buildSessionContext();
    const systemPrompt = this.promptBuilder.buildSystemPrompt(this.activeSkillPrompts);
    return estimateContextUsageHelper(context.messages, systemPrompt, this.model?.contextWindow);
  }

  getSessionStats() {
    const entries = this.sessionManager.getEntries();
    let userMessages = 0;
    let assistantMessages = 0;
    let toolCalls = 0;
    let toolResults = 0;
    let tokensIn = 0;
    let tokensOut = 0;

    for (const entry of entries) {
      if (entry.type === "message") {
        if (entry.message.role === "user") userMessages++;
        if (entry.message.role === "assistant") {
          assistantMessages++;
          const tc =
            (entry.message.content as any)?.filter((c: any) => c.type === "toolCall") || [];
          toolCalls += tc.length;
        }
        if (entry.message.role === "toolResult") toolResults++;
      }
    }

    const messages = this.agent?.state?.messages || [];
    for (const m of messages) {
      const usage = (m as any).usage;
      if (usage) {
        tokensIn += usage.input || usage.promptTokens || usage.prompt_tokens || 0;
        tokensOut += usage.output || usage.completionTokens || usage.completion_tokens || 0;
      }
    }

    return {
      sessionFile: this.sessionManager.getSessionFile(),
      sessionId: this.sessionManager.getSessionId(),
      userMessages,
      assistantMessages,
      toolCalls,
      toolResults,
      totalMessages: entries.length,
      tokens: {
        input: tokensIn,
        output: tokensOut,
        cacheRead: 0,
        cacheWrite: 0,
        total: tokensIn + tokensOut,
      },
      cost: 0,
    };
  }

  async dispose(): Promise<void> {
    await this.abort();
    this.eventBus.clear();
  }

  private handleSessionError(errorMsg: string) {
    console.error(`[AgentSession Error] Session ${this.sessionManager.getSessionId()}:`, errorMsg);
    const assistantErrorMessage = {
      role: "assistant" as const,
      content: [],
      stopReason: "error",
      errorMessage: errorMsg,
      timestamp: Date.now(),
      api: "",
      provider: "",
      model: "",
      usage: { tokensIn: 0, tokensOut: 0 },
    } as any;
    this.sessionManager.appendMessage(assistantErrorMessage);
    this.messages = this.sessionManager.buildSessionContext().messages;
    this.emit({ type: "message_start", message: assistantErrorMessage });
    this.emit({ type: "message_end", message: assistantErrorMessage });
    this.emit({ type: "agent_error", error: errorMsg });
    this.emit({ type: "agent_end", messages: this.messages, willRetry: false });
  }
}

export async function createAgentSession(
  options: CreateAgentSessionOptions,
): Promise<{ session: AgentSession; extensionsResult: any }> {
  try {
    const session = new AgentSession(options);
    return {
      session,
      extensionsResult: { extensions: [], diagnostics: [] },
    };
  } catch (err) {
    console.error("[createAgentSession] Error initializing AgentSession:", err);
    throw err;
  }
}
