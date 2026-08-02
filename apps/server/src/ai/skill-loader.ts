// SPDX-License-Identifier: MIT
import type { DefaultResourceLoader } from "./resource-loader";

function formatSkillsForSystemPrompt(skills: any[]): string {
  if (!skills || skills.length === 0) return "";
  return skills.map((s) => `# ${s.name}\n${s.description}`).join("\n\n");
}

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
