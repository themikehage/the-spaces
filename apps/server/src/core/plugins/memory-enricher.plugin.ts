// SPDX-License-Identifier: MIT
import { BasePlugin, type ModelCallContext } from "shared";

export interface MemoryEnricherPluginConfig {
  memory?: any;
}

export class MemoryEnricherPlugin extends BasePlugin {
  readonly name = "MemoryEnricherPlugin";
  readonly priority = 30;

  constructor(private config: MemoryEnricherPluginConfig) {
    super();
  }

  async beforeModelCall(ctx: ModelCallContext): Promise<void> {
    if (this.config.memory && typeof this.config.memory.buildContext === "function") {
      try {
        await this.config.memory.buildContext(String(ctx.prompt || ""), { sessionId: ctx.sessionId });
      } catch (e) {
        console.error("[MemoryEnricherPlugin] Failed to build context:", e);
      }
    }
  }
}
