// SPDX-License-Identifier: MIT
import type { PromptFragment } from "../registry";

export const identityFragments: PromptFragment[] = [
  {
    key: "identity.agent_core",
    category: "identity",
    content: "Eres {name}.\nInstrucciones de identidad:\n{systemPrompt}",
    priority: 1,
  },
];
