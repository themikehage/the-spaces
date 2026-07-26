// SPDX-License-Identifier: MIT
import {
  getAgentWorkspaceDir,
  getProjectWorkspaceDir,
  getTeamWorkspaceDir,
  getWorkspaceDir,
} from "shared";
import type { WorkspaceConfigPort } from "../ports/workspace-config.port";
import type { ScopeConfigManager } from "../scope/scope-config-manager";
import { deepMerge } from "./config-merger";
import type { EntityConfig } from "./entity-config";

export interface EntityRef {
  agentId?: string;
  projectId?: string;
  teamId?: string;
}

export class CascadeConfigLoader {
  constructor(
    private readonly loader: WorkspaceConfigPort,
    private readonly scopeResolver: ScopeConfigManager,
  ) {}

  async load(username: string, entity: EntityRef): Promise<EntityConfig> {
    const globalConfig = await this.loadGlobal(username);
    const entityConfig = await this.loadEntity(username, entity);
    return deepMerge(globalConfig, entityConfig);
  }

  private async loadGlobal(username: string): Promise<EntityConfig> {
    const workspaceDir = getWorkspaceDir(username);
    const config = await this.loader.load(workspaceDir);
    return config ?? {};
  }

  private async loadEntity(username: string, entity: EntityRef): Promise<EntityConfig> {
    const workspaceDir = this.resolveWorkspace(username, entity);
    if (!workspaceDir) return {};
    const config = await this.loader.load(workspaceDir);
    return config ?? {};
  }

  private resolveWorkspace(username: string, entity: EntityRef): string | null {
    if (entity.teamId) return getTeamWorkspaceDir(username, entity.teamId);
    if (entity.projectId) return getProjectWorkspaceDir(username, entity.projectId);
    if (entity.agentId) {
      const membership = this.scopeResolver.getAgentMembership(username, entity.agentId);
      if (membership?.type === "project") {
        return getProjectWorkspaceDir(username, membership.id);
      }
      return getAgentWorkspaceDir(username, entity.agentId);
    }
    return null;
  }
}
