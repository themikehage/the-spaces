import type { SpacesHost, ModelResolutionContext } from "@spaces/sdk-core";

export interface AgentRuntimeOptions {
  host: SpacesHost;
  sessionId: string;
  username: string;
  workspaceDir: string;
  resolvedAgentId?: string;
  projectId?: string;
}

export interface ToolCallHookContext {
  sessionId: string;
  username: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  durationMs?: number;
}

export type BeforeToolCallHook = (ctx: ToolCallHookContext) => Promise<boolean>;
export type AfterToolCallHook = (ctx: ToolCallHookContext) => Promise<void>;

export class AgentRuntime {
  constructor(private opts: AgentRuntimeOptions) {}

  public get host(): SpacesHost {
    return this.opts.host;
  }

  public get sessionId(): string {
    return this.opts.sessionId;
  }

  public get username(): string {
    return this.opts.username;
  }

  public resolveModel(ctx: ModelResolutionContext): string | undefined {
    return this.opts.host.models.resolveModel(ctx);
  }

  public async loadWorkspaceConfig() {
    return this.opts.host.config.load(this.opts.workspaceDir);
  }

  public async onBeforeToolCall(hook: BeforeToolCallHook, ctx: ToolCallHookContext): Promise<boolean> {
    return hook(ctx);
  }

  public async onAfterToolCall(hook: AfterToolCallHook, ctx: ToolCallHookContext): Promise<void> {
    await hook(ctx);
  }
}

export function createAgentRuntime(opts: AgentRuntimeOptions): AgentRuntime {
  return new AgentRuntime(opts);
}
