import type {
  AgentRuntimeDependencies,
  IModelProvider,
  ISessionStore,
} from "@spaces/core";
import { AgentRuntime } from "../agent-runtime.js";
import { HookRunner } from "../hook-runner.js";
import { PermissionEngine } from "../permission-engine.js";
import { PromptBuilder } from "../prompt-builder.js";
import { ToolExecutor, ToolRegistry } from "../tool-executor.js";

export type CreateAgentOptions = Partial<AgentRuntimeDependencies> & {
  modelProvider: IModelProvider;
  sessionStore: ISessionStore;
};

export function createAgent(id: string, options: CreateAgentOptions): AgentRuntime {
  const hookRunner = options.hookRunner ?? new HookRunner();
  const permissionEngine = options.permissionEngine ?? new PermissionEngine();
  const promptBuilder = options.promptBuilder ?? new PromptBuilder();
  const toolExecutor =
    options.toolExecutor ??
    new ToolExecutor(new ToolRegistry(), permissionEngine, hookRunner);

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
