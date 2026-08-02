// SPDX-License-Identifier: MIT
import { BasePlugin, type LegacyToolResult, type PluginToolCallContext } from "@spaces/core";
import { recordToolCallAudit } from "../audit-log";

export interface AuditLogPluginConfig {
  username: string;
  sessionId: string;
  parentSessionId?: string;
  agentId?: string;
}

export class AuditLogPlugin extends BasePlugin {
  readonly name = "AuditLogPlugin";
  readonly priority = 10;

  constructor(private config: AuditLogPluginConfig) {
    super();
  }

  async afterToolCall(ctx: PluginToolCallContext, result: LegacyToolResult | any): Promise<void> {
    const toolName = typeof ctx.tool === "string" ? ctx.tool : ctx.tool.name;
    const isError =
      result && typeof result === "object" && "isError" in result ? Boolean(result.isError) : false;
    const errorMsg =
      result && typeof result === "object" && "errorCode" in result
        ? String(result.errorCode)
        : undefined;
    const durationMs =
      result && typeof result === "object" && result.metadata?.durationMs
        ? Number(result.metadata.durationMs)
        : 0;

    recordToolCallAudit(this.config.username, {
      sessionId: this.config.sessionId,
      parentSessionId: this.config.parentSessionId,
      agentId: this.config.agentId,
      toolName,
      durationMs,
      status: isError ? "error" : "success",
      argsSummary: ctx.args,
      errorMsg,
    });
  }
}
