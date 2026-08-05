import type { IPromptBuilder, PromptSection, PromptContext } from "@auto-browser/core";

export class PromptBuilder implements IPromptBuilder {
  private sections: PromptSection[] = [];

  registerSection(section: PromptSection): void {
    this.sections.push(section);
    this.sections.sort((a, b) => a.priority - b.priority);
  }

  async build(ctx: PromptContext): Promise<string> {
    const parts: string[] = [];
    for (const section of this.sections) {
      if (section.condition && !section.condition(ctx)) continue;
      const rendered = await section.render(ctx);
      if (rendered.trim()) parts.push(rendered);
    }
    return parts.join("\n\n");
  }
}
