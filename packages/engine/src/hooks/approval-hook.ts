import type { Hook, IApprovalChannel, ToolCallContext } from "@spaces/core";

export class ApprovalHook implements Hook {
  readonly id = "approval";
  readonly priority = 100;

  constructor(private channel: IApprovalChannel) {}

  async beforeToolCall(ctx: ToolCallContext): Promise<ToolCallContext | null> {
    const approved = await this.channel.request({
      tool: ctx.toolCall.name,
      args: ctx.toolCall.arguments,
      sessionId: ctx.sessionId,
    });
    return approved ? ctx : null;
  }
}
