import type { PromptContext } from "../types.ts";

export interface PromptSection {
  readonly id: string;
  readonly priority: number;
  condition?(ctx: PromptContext): boolean;
  render(ctx: PromptContext): Promise<string>;
}

export interface IPromptBuilder {
  registerSection(section: PromptSection): void;
  build(ctx: PromptContext): Promise<string>;
}
