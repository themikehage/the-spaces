// SPDX-License-Identifier: MIT
import { BasePlugin, type PluginToolCallContext } from "@spaces/core";

export interface WsNotifyPluginConfig {
  sessionId: string;
  onToolExecuted?: (toolName: string, args: unknown) => void;
}

export class WsNotifyPlugin extends BasePlugin {
  readonly name = "WsNotifyPlugin";
  readonly priority = 20;

  constructor(private config: WsNotifyPluginConfig) {
    super();
  }

  async afterToolCall(ctx: PluginToolCallContext): Promise<void> {
    const toolName = typeof ctx.tool === "string" ? ctx.tool : ctx.tool.name;
    if (this.config.onToolExecuted) {
      this.config.onToolExecuted(toolName, ctx.args);
    }
  }
}
