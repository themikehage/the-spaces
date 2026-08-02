// SPDX-License-Identifier: MIT
import type { AgentContext, PromptSection } from "@spaces/core";

export class SystemIdentitySection implements PromptSection {
  readonly id = "system-identity";
  readonly priority = 0;

  async render(ctx: AgentContext): Promise<string> {
    return "You are a helpful, autonomous software engineer agent executing tasks cleanly and efficiently.";
  }
}
