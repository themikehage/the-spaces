import type {
  AgentRuntimeDependencies,
  Hook,
  IModelProvider,
  ISessionStore,
  IToolRegistry,
} from "@spaces/core";
import { AgentRuntime } from "../agent-runtime.js";
import { HookRunner } from "../hook-runner.js";
import { PermissionEngine } from "../permission-engine.js";
import { PromptBuilder } from "../prompt-builder.js";
import { ToolExecutor } from "../tool-executor.js";

export type CreateAgentOptions = Partial<AgentRuntimeDependencies> & {
  modelProvider: IModelProvider;
  sessionStore: ISessionStore;
  toolRegistry?: IToolRegistry;
  hooks?: Hook[];
};

export function createAgent(id: string, options: CreateAgentOptions): AgentRuntime {
  const hookRunner = options.hookRunner ?? new HookRunner();
  if (options.hooks) {
    for (const h of options.hooks) {
      hookRunner.register(h);
    }
  }
  const permissionEngine = options.permissionEngine ?? new PermissionEngine();
  const promptBuilder = options.promptBuilder ?? new PromptBuilder();
  const toolExecutor =
    options.toolExecutor ??
    (options.toolRegistry
      ? new ToolExecutor(options.toolRegistry, permissionEngine, hookRunner)
      : undefined);

  if (!toolExecutor) {
    throw new Error("createAgent requires either toolExecutor or toolRegistry in options");
  }

  const deps: AgentRuntimeDependencies = {
    modelProvider: options.modelProvider,
    sessionStore: options.sessionStore,
    toolExecutor,
    promptBuilder,
    hookRunner,
    permissionEngine,
    memoryProvider: options.memoryProvider,
  };

  return new AgentRuntime(id, deps);
}
