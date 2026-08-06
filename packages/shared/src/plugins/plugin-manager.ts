// SPDX-License-Identifier: MIT
import { type ToolResult } from "../tools";
import {
  type BasePlugin,
  type ModelCallContext,
  type SessionContext,
  type ToolCallContext,
} from "./base-plugin";

/**
 * @deprecated The plugin system is deprecated and non-operational. Use hooks and custom tools instead.
 */
export class PluginManager {
  private plugins: BasePlugin[] = [];

  register(plugin: BasePlugin): void {
    if (this.plugins.some((p) => p.name === plugin.name)) {
      return;
    }
    this.plugins.push(plugin);
    this.plugins.sort((a, b) => a.priority - b.priority);
  }

  getPlugin(name: string): BasePlugin | undefined {
    return this.plugins.find((p) => p.name === name);
  }

  async executeBeforeToolCall(ctx: ToolCallContext): Promise<Record<string, unknown> | void> {
    for (const plugin of this.plugins) {
      if (plugin.beforeToolCall) {
        try {
          const res = await plugin.beforeToolCall(ctx);
          if (res !== undefined) return res;
        } catch (e) {
          console.error(`[PluginManager] Error in plugin '${plugin.name}' beforeToolCall:`, e);
        }
      }
    }
  }

  async executeAfterToolCall(
    ctx: ToolCallContext,
    result: ToolResult | unknown,
  ): Promise<ToolResult | unknown> {
    let currentResult = result;
    for (const plugin of this.plugins) {
      if (plugin.afterToolCall) {
        try {
          const res = await plugin.afterToolCall(ctx, currentResult);
          if (res !== undefined) {
            currentResult = res;
          }
        } catch (e) {
          console.error(`[PluginManager] Error in plugin '${plugin.name}' afterToolCall:`, e);
        }
      }
    }
    return currentResult;
  }

  async executeBeforeModelCall(ctx: ModelCallContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.beforeModelCall) {
        try {
          await plugin.beforeModelCall(ctx);
        } catch (e) {
          console.error(`[PluginManager] Error in plugin '${plugin.name}' beforeModelCall:`, e);
        }
      }
    }
  }

  async executeOnSessionStart(ctx: SessionContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onSessionStart) {
        try {
          await plugin.onSessionStart(ctx);
        } catch (e) {
          console.error(`[PluginManager] Error in plugin '${plugin.name}' onSessionStart:`, e);
        }
      }
    }
  }

  async executeOnSessionEnd(ctx: SessionContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onSessionEnd) {
        try {
          await plugin.onSessionEnd(ctx);
        } catch (e) {
          console.error(`[PluginManager] Error in plugin '${plugin.name}' onSessionEnd:`, e);
        }
      }
    }
  }
}
