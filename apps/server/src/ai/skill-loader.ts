// SPDX-License-Identifier: MIT
import type { DefaultResourceLoader } from "./resource-loader";
import { formatSkillsForSystemPrompt } from "./vendor/agent/src/harness/system-prompt.ts";

export class SkillLoader {
  constructor(private resourceLoader: DefaultResourceLoader) {}

  getAvailableSkillsPrompt(): string {
    const skills = this.resourceLoader.getSkills().skills;
    return formatSkillsForSystemPrompt(skills as any);
  }

  getSkillsDiagnostics() {
    return this.resourceLoader.getSkills().diagnostics;
  }
}
