import type { AgentContext } from "../types.js";

export interface PromptSection {
  readonly id: string;
  readonly priority: number;
  condition?(ctx: AgentContext): boolean;
  render(ctx: AgentContext): Promise<string>;
}

export interface IPromptBuilder {
  registerSection(section: PromptSection): void;
  build(ctx: AgentContext): Promise<string>;
}
