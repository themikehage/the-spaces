// SPDX-License-Identifier: MIT
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { WorkspaceConfig, WorkspaceConfigPort } from "../ports/workspace-config.port";

export class FileWorkspaceConfigLoader implements WorkspaceConfigPort {
  async load(workspaceDir: string): Promise<WorkspaceConfig | null> {
    const configPath = join(workspaceDir, ".spaces", "config.json");
    if (!existsSync(configPath)) {
      return null;
    }
    try {
      const content = readFileSync(configPath, "utf-8");
      return JSON.parse(content) as WorkspaceConfig;
    } catch (err) {
      console.error(
        `[FileWorkspaceConfigLoader] Failed to read workspace config at ${configPath}:`,
        err,
      );
      return null;
    }
  }
}
