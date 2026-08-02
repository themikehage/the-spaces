import type { AgentContext, IPromptBuilder, PromptSection } from "@spaces/core";

export class PromptBuilder implements IPromptBuilder {
  private sections: PromptSection[] = [];

  registerSection(section: PromptSection): void {
    this.sections.push(section);
    this.sections.sort((a, b) => a.priority - b.priority);
  }

  async build(ctx: AgentContext): Promise<string> {
    const parts: string[] = [];
    for (const section of this.sections) {
      if (section.condition && !section.condition(ctx)) {
        continue;
      }
      const rendered = await section.render(ctx);
      if (rendered && rendered.trim().length > 0) {
        parts.push(rendered.trim());
      }
    }
    return parts.join("\n\n");
  }
}
