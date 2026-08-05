// SPDX-License-Identifier: MIT
import type {
  AgentContext,
  IPromptBuilder,
  PromptSection,
} from "../ports/prompt-builder.port";
import type { DefaultResourceLoader } from "./resource-loader";
import { SkillLoader } from "./skill-loader";

export class PromptBuilder implements IPromptBuilder {
  private skillLoader: SkillLoader;
  private sections: PromptSection[] = [];

  constructor(private resourceLoader: DefaultResourceLoader) {
    this.skillLoader = new SkillLoader(resourceLoader);
  }

  addSection(section: PromptSection): void {
    this.sections.push(section);
    this.sections.sort((a, b) => a.priority - b.priority);
  }

  async build(ctx: AgentContext): Promise<string> {
    const renderedSections: string[] = [];
    for (const section of this.sections) {
      if (!section.condition || section.condition(ctx)) {
        const text = await section.render(ctx);
        if (text) renderedSections.push(text);
      }
    }
    const systemPrompt = this.buildSystemPrompt();
    return [systemPrompt, ...renderedSections].filter(Boolean).join("\n\n");
  }

  buildSystemPrompt(activeSkillPrompts: string[] = []): string {
    const basePrompt = this.resourceLoader.getSystemPrompt() || "";
    const appendPrompts = this.resourceLoader.getAppendSystemPrompt() || [];
    const availableSkillsPrompt = this.skillLoader.getAvailableSkillsPrompt();

    return [basePrompt, ...appendPrompts, availableSkillsPrompt, ...activeSkillPrompts]
      .filter(Boolean)
      .join("\n\n");
  }
}
