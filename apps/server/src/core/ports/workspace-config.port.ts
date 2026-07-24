// SPDX-License-Identifier: MIT
export interface WorkspaceConfig {
  rules?: string[];
  skills?: string[];
  workflows?: string[];
  defaultModel?: string;
  permissionOverrides?: Record<string, "allow" | "deny" | "ask">;
}

export interface WorkspaceConfigPort {
  load(workspaceDir: string): Promise<WorkspaceConfig | null>;
}
