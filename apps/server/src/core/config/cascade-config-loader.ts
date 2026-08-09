// SPDX-License-Identifier: MIT
import { getWorkspaceDir, type AgentRef } from "shared";
import { agentTypeRegistry } from "../entities/agent-type-registry";
import type { WorkspaceConfigPort } from "../ports/workspace-config.port";
import { deepMerge } from "./config-merger";
import type { EntityConfig } from "./entity-config";

export class CascadeConfigLoader {
  constructor(
    private readonly loader: WorkspaceConfigPort,
    private readonly scopeResolver?: any,
  ) {}

  async load(username: string, entity: AgentRef): Promise<EntityConfig> {
    const globalConfig = await this.loadGlobal(username);
    const entityConfig = await this.loadEntity(username, entity);
    return deepMerge(globalConfig, entityConfig);
  }

  private async loadGlobal(username: string): Promise<EntityConfig> {
    const workspaceDir = getWorkspaceDir(username);
    const config = await this.loader.load(workspaceDir);
    return config ?? {};
  }

  private async loadEntity(username: string, entity: AgentRef): Promise<EntityConfig> {
    const workspaceDir = this.resolveWorkspace(username, entity);
    if (!workspaceDir) return {};
    const config = await this.loader.load(workspaceDir);
    return config ?? {};
  }

  private resolveWorkspace(username: string, entity: AgentRef): string | null {
    if (entity && entity.type && entity.id) {
      return agentTypeRegistry.get(entity.type).getWorkspaceDir(username, entity.id);
    }
    return null;
  }
}
