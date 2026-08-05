import type { AgentContext, ContextUsage, AgentMessage, PromptOptions } from "../types.ts";
import type { IEventBus } from "./event-bus.port.ts";

export interface IAgentRuntime {
  readonly id: string;
  readonly events: IEventBus;

  prompt(message: string, opts?: PromptOptions): Promise<void>;
  abort(): Promise<void>;
  dispose(): Promise<void>;

  getMessages(): AgentMessage[];
  getContext(): AgentContext;
  getContextUsage(): ContextUsage;
}
