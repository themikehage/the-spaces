import type { AgentEvent } from "../events.js";
import type { AgentMessage, ContextUsage } from "../types.js";
import type { IEventBus } from "./event-bus.port.js";
import type { IHookRunner } from "./hook.port.js";
import type { IMemoryProvider } from "./memory.port.js";
import type { IModelProvider } from "./model.port.js";
import type { IPermissionEngine } from "./permission.port.js";
import type { IPromptBuilder } from "./prompt.port.js";
import type { ISessionStore } from "./session.port.js";
import type { IToolExecutor } from "./tool.port.js";

export interface IAgentRuntime {
  readonly id: string;
  readonly events: IEventBus<AgentEvent>;
  prompt(message: string, opts?: { metadata?: Record<string, unknown> }): Promise<void>;
  abort(): Promise<void>;
  dispose(): Promise<void>;
  getMessages(): Promise<AgentMessage[]>;
  getContextUsage(): ContextUsage;
}

export interface AgentRuntimeDependencies {
  modelProvider: IModelProvider;
  toolExecutor: IToolExecutor;
  promptBuilder: IPromptBuilder;
  hookRunner: IHookRunner;
  permissionEngine: IPermissionEngine;
  sessionStore: ISessionStore;
  memoryProvider?: IMemoryProvider;
}
