// SPDX-License-Identifier: MIT
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getAgentWorkspaceDir, type AgentType } from "shared";
import type { AgentRef } from "../ports/agent-type-registry.port";

export function resolveEntityParent(username: string, agentId: string): AgentRef | null {
  const agentWorkspace = getAgentWorkspaceDir(username, agentId);
  const configPath = join(agentWorkspace, ".spaces", "config.json");
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      if (config.parent) {
        return {
          type: config.parent.type as AgentType,
          id: config.parent.id,
        };
      }
    } catch {
      /* noop */
    }
  }
  return null;
}
