// SPDX-License-Identifier: MIT
import type { EntityConfig } from "../config/entity-config";

export type WorkspaceConfig = EntityConfig;

export interface WorkspaceConfigPort {
  load(workspaceDir: string): Promise<EntityConfig | null>;
}

