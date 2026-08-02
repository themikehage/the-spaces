import type { AgentContext, IMemoryProvider, PromptSection } from "@spaces/core";

export class MemoryPromptSection implements PromptSection {
  readonly id = "memory";
  readonly priority = 30;

  constructor(private memoryProvider: IMemoryProvider) {}

  async render(ctx: AgentContext): Promise<string> {
    const lastMsg =
      typeof ctx.messages.at(-1)?.content === "string"
        ? (ctx.messages.at(-1)?.content as string)
        : "";
    if (!lastMsg) return "";

    const memories = await this.memoryProvider.search(lastMsg);
    if (!memories || memories.length === 0) return "";

    return "## Relevant Memories\n" + memories.map((m) => `- ${m.content}`).join("\n");
  }
}
