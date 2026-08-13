import type { ToolRegistry } from "../infra/tool-registry";
import type { DefaultResourceLoader } from "./resource-loader";

export interface SlashResolution {
  skillPrompts: string[];
  toolDirective: string;
  toolNamesToActivate: string[];
}

export class SlashResolver {
  constructor(
    private resourceLoader: DefaultResourceLoader,
    private toolRegistry: ToolRegistry,
  ) {}

  resolve(messageText: string, currentActiveToolNames: string[]): SlashResolution {
    const availableSkills = this.resourceLoader.getSkills().skills;
    const matches = [...messageText.matchAll(/(?:^|\s)\/([a-zA-Z0-9_-]+)/g)];
    const uniqueNames = new Set(matches.map((m) => m[1].toLowerCase()));

    const matchedSkills = [];
    const unmatchedNames: string[] = [];

    for (const name of uniqueNames) {
      const skill = availableSkills.find((s) => s.name.toLowerCase() === name);
      if (skill) {
        matchedSkills.push(skill);
      } else {
        unmatchedNames.push(name);
      }
    }

    const skillPrompts: string[] = [];
    for (const skill of matchedSkills) {
      if (skill.content) {
        skillPrompts.push(`=== Active Skill Instructions: ${skill.name} ===\n${skill.content}`);
      }
    }

    const allTools = this.toolRegistry.getAllTools();
    const matchedTools = [];
    for (const name of unmatchedNames) {
      const tool = allTools.find((t) => t.name.toLowerCase() === name);
      if (tool) {
        matchedTools.push(tool);
      }
    }

    const currentActiveLower = new Set(currentActiveToolNames.map((n) => n.toLowerCase()));
    const toolNamesToActivate = matchedTools
      .filter((t) => !currentActiveLower.has(t.name.toLowerCase()))
      .map((t) => t.name);

    let toolDirective = "";
    if (matchedTools.length > 0) {
      const toolListStr = matchedTools.map((t) => t.name).join(", ");
      toolDirective = `=== Explicitly Requested Tools ===\nThe user explicitly referenced: ${toolListStr}. These are active this turn; prefer using them when relevant.`;
    }

    return {
      skillPrompts,
      toolDirective,
      toolNamesToActivate,
    };
  }
}
