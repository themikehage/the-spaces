// SPDX-License-Identifier: MIT
import type { DefaultResourceLoader } from "./resource-loader";
import { SkillLoader } from "./skill-loader";

export class PromptBuilder {
  private skillLoader: SkillLoader;

  constructor(private resourceLoader: DefaultResourceLoader) {
    this.skillLoader = new SkillLoader(resourceLoader);
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
