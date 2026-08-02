import type { Hook, IAgentRuntime, ToolCallContext } from "@spaces/core";

export class DelegationHook implements Hook {
  readonly id = "delegation";
  readonly priority = 20;

  constructor(private subAgents: Map<string, IAgentRuntime>) {}

  async beforeToolCall(ctx: ToolCallContext): Promise<ToolCallContext | null> {
    if (ctx.toolCall.name.startsWith("delegate_to_")) {
      const targetAgentId = ctx.toolCall.name.replace("delegate_to_", "");
      const subAgent = this.subAgents.get(targetAgentId);
      if (subAgent) {
        const promptText = String(ctx.toolCall.arguments.prompt ?? "");
        await subAgent.prompt(promptText);
      }
    }
    return ctx;
  }
}
