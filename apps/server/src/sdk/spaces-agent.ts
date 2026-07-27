// SPDX-License-Identifier: MIT
import {
  SpacesAgentConfigSchema,
  type AgentDefinition,
  type ResolvedSpacesAgentConfig,
  type SpacesAgentConfig,
} from "shared";
import { createAgentRuntime, type AgentRuntimeInstance } from "../core/session/agent-runtime";

export class SpacesAgent {
  readonly config: ResolvedSpacesAgentConfig;

  constructor(config: SpacesAgentConfig) {
    this.config = SpacesAgentConfigSchema.parse(config);
  }

  toAgentDefinition(): AgentDefinition {
    const sanitizedId =
      this.config.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "agent";

    return {
      id: sanitizedId,
      name: this.config.name,
      systemPrompt: this.config.instruction,
      serialTools: [],
    };
  }

  async createRuntime(username = "default", sessionId?: string): Promise<AgentRuntimeInstance> {
    const sid = sessionId ?? crypto.randomUUID();

    const runtime = await createAgentRuntime({
      username,
      sessionId: sid,
      agentId: this.toAgentDefinition().id,
      agentDef: this.toAgentDefinition(),
      customTools: this.config.tools,
      skipMemory: !this.config.memory,
      workspaceDir: this.config.workspaceDir,
      toolProfile: "user-session",
    });

    if (this.config.thinkingLevel && runtime.session?.setThinkingLevel) {
      runtime.session.setThinkingLevel(this.config.thinkingLevel);
    }

    return runtime;
  }
}
