// SPDX-License-Identifier: MIT
import type { BaseTool, LegacyToolResult } from "./tools-legacy.js";

export interface PluginToolCallContext {
  sessionId: string;
  username: string;
  tool: BaseTool | { name: string; description?: string };
  args: Record<string, unknown>;
  isSubagent?: boolean;
}

export interface ModelCallContext {
  sessionId: string;
  username: string;
  modelId: string;
  prompt?: unknown;
}

export interface SessionContext {
  sessionId: string;
  username: string;
  workspaceDir: string;
}

export abstract class BasePlugin {
  abstract readonly name: string;
  readonly priority: number = 50;

  async initialize?(): Promise<void>;
  async shutdown?(): Promise<void>;

  async beforeToolCall?(ctx: PluginToolCallContext): Promise<Record<string, unknown> | void>;
  async afterToolCall?(
    ctx: PluginToolCallContext,
    result: LegacyToolResult | unknown,
  ): Promise<LegacyToolResult | unknown | void>;
  async beforeModelCall?(ctx: ModelCallContext): Promise<void>;
  async afterModelCall?(ctx: ModelCallContext, response: unknown): Promise<unknown | void>;
  async onModelError?(ctx: ModelCallContext, error: Error): Promise<unknown | void>;
  async onSessionStart?(ctx: SessionContext): Promise<void>;
  async onSessionEnd?(ctx: SessionContext): Promise<void>;
}

export class PluginManager {
  private plugins: BasePlugin[] = [];

  register(plugin: BasePlugin): void {
    this.plugins.push(plugin);
    this.plugins.sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));
  }

  getPlugins(): readonly BasePlugin[] {
    return this.plugins;
  }
}
