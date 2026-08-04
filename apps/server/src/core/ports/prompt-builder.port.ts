// SPDX-License-Identifier: MIT

export interface AgentContext {
  sessionId: string;
  cwd: string;
  messages: unknown[];
}

export interface PromptSection {
  id: string;
  priority: number;
  condition?: (ctx: AgentContext) => boolean;
  render(ctx: AgentContext): Promise<string>;
}

export interface IPromptBuilder {
  addSection(section: PromptSection): void;
  build(ctx: AgentContext): Promise<string>;
  buildSystemPrompt(skillPrompts?: string[]): string;
}
