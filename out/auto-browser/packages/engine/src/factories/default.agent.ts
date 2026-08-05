import type {
  IModelProvider,
  ISessionStore,
  IToolExecutor,
  IHookRunner,
  IPromptBuilder,
  IPermissionEngine,
} from "@auto-browser/core";
import { AgentRuntime, type AgentRuntimeDeps } from "../agent-runtime.ts";
import { PromptBuilder } from "../prompt-builder.ts";
import { HookRunner } from "../hook-runner.ts";
import { PermissionEngine } from "../permission-engine.ts";
import { ToolRegistry, ToolExecutor } from "../tool-executor.ts";
import { EventBus } from "../event-bus.ts";

export interface CreateAgentConfig {
  id: string;
  modelProvider: IModelProvider;
  sessionStore: ISessionStore;
  toolExecutor?: IToolExecutor;
  promptBuilder?: IPromptBuilder;
  hookRunner?: IHookRunner;
  permissionEngine?: IPermissionEngine;
  systemPrompt?: string;
}

export async function createAgent(config: CreateAgentConfig): Promise<AgentRuntime> {
  const promptBuilder = config.promptBuilder ?? new PromptBuilder();

  if (config.systemPrompt && !config.promptBuilder) {
    const prompt = config.systemPrompt;
    (promptBuilder as PromptBuilder).registerSection({
      id: "system-identity",
      priority: 0,
      render: async () => prompt,
    });
  }

  const deps: AgentRuntimeDeps = {
    modelProvider: config.modelProvider,
    toolExecutor: config.toolExecutor ?? new ToolExecutor(new ToolRegistry()),
    promptBuilder,
    hookRunner: config.hookRunner ?? new HookRunner(),
    permissionEngine: config.permissionEngine ?? new PermissionEngine(),
    sessionStore: config.sessionStore,
  };

  const runtime = new AgentRuntime(config.id, deps, new EventBus());
  await runtime.initialize();
  return runtime;
}
