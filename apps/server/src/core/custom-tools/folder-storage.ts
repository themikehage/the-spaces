// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getWorkspaceDir } from "shared";
import type { FolderCustomTool, ICustomToolProvider, CustomToolStorageOptions } from "../ports/custom-tool-provider.port";
import { type CustomToolDefinition, CustomToolDefinitionSchema } from "./schemas";

export class FolderCustomToolStorage implements ICustomToolProvider {
  /**
   * Primary storage directory for writing (upserting) custom tools.
   * Target: <workspaceDir>/.spaces/tools/ (e.g. C:\app\...\workspace\.spaces\tools)
   */
  private getPrimaryStorageDir(username: string, workspaceDir?: string): string {
    const targetWs = workspaceDir || getWorkspaceDir(username);
    const dir = join(targetWs, ".spaces", "tools");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Candidate search directories for loading custom tools:
   * 1. workspaceDir/.spaces/tools (if workspaceDir provided, e.g. agent or project workspace)
   * 2. userWorkspace/.spaces/tools (main user workspace)
   */
  private getCandidateStorageDirs(username: string, workspaceDir?: string): string[] {
    const candidateSet = new Set<string>();

    if (workspaceDir) {
      candidateSet.add(join(workspaceDir, ".spaces", "tools"));
    }

    candidateSet.add(join(getWorkspaceDir(username), ".spaces", "tools"));

    return Array.from(candidateSet).filter((d) => existsSync(d));
  }

  loadAll(username: string, options?: CustomToolStorageOptions): FolderCustomTool[] {
    const dirs = this.getCandidateStorageDirs(username, options?.workspaceDir);
    const toolsMap = new Map<string, FolderCustomTool>();

    // Scan candidate directories in reverse order so higher-priority paths override lower-priority ones
    for (const storageDir of [...dirs].reverse()) {
      try {
        const entries = readdirSync(storageDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const tool = this.getToolFromDir(entry.name, join(storageDir, entry.name));
            if (tool) {
              toolsMap.set(tool.definition.name, tool);
            }
          }
        }
      } catch (err) {
        console.warn(`[FolderCustomToolStorage] Failed to scan tools in ${storageDir}:`, err);
      }
    }

    return Array.from(toolsMap.values());
  }

  get(username: string, name: string, options?: CustomToolStorageOptions): FolderCustomTool | null {
    const dirs = this.getCandidateStorageDirs(username, options?.workspaceDir);

    for (const storageDir of dirs) {
      const toolDir = join(storageDir, name);
      if (existsSync(toolDir)) {
        const tool = this.getToolFromDir(name, toolDir);
        if (tool) return tool;
      }
    }

    return null;
  }

  private getToolFromDir(name: string, toolDir: string): FolderCustomTool | null {
    const defPath = join(toolDir, "definition.json");
    if (!existsSync(defPath)) return null;

    try {
      const content = readFileSync(defPath, "utf8");
      const raw = JSON.parse(content);

      const definition = CustomToolDefinitionSchema.parse(raw);
      const instructionsPath = join(toolDir, "Tool.md");
      const instructionsMd = existsSync(instructionsPath)
        ? readFileSync(instructionsPath, "utf8")
        : undefined;

      const hasUi = existsSync(join(toolDir, "ui", "index.html"));
      const hasScripts = existsSync(join(toolDir, "scripts"));

      return {
        definition,
        instructionsMd,
        hasUi,
        hasScripts,
        toolDir,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[FolderCustomToolStorage] Skipping invalid custom tool "${name}" in ${toolDir}: ${msg}`);
      return null;
    }
  }

  upsert(username: string, tool: FolderCustomTool, options?: CustomToolStorageOptions): void {
    const storageDir = this.getPrimaryStorageDir(username, options?.workspaceDir);
    const toolDir = join(storageDir, tool.definition.name);

    if (!existsSync(toolDir)) {
      mkdirSync(toolDir, { recursive: true });
    }

    const now = new Date().toISOString();
    const cleanDef: CustomToolDefinition = {
      ...tool.definition,
      createdAt: tool.definition.createdAt || now,
      updatedAt: now,
    };

    writeFileSync(
      join(toolDir, "definition.json"),
      JSON.stringify(cleanDef, null, 2),
      "utf8",
    );

    if (tool.instructionsMd !== undefined) {
      writeFileSync(join(toolDir, "Tool.md"), tool.instructionsMd, "utf8");
    }

    if (tool.scriptContent !== undefined) {
      const scriptsDir = join(toolDir, "scripts");
      if (!existsSync(scriptsDir)) {
        mkdirSync(scriptsDir, { recursive: true });
      }
      writeFileSync(join(scriptsDir, "execute.js"), tool.scriptContent, "utf8");
    }

    if (tool.uiHtml !== undefined) {
      const uiDir = join(toolDir, "ui");
      if (!existsSync(uiDir)) {
        mkdirSync(uiDir, { recursive: true });
      }
      writeFileSync(join(uiDir, "index.html"), tool.uiHtml, "utf8");
    }
  }

  delete(username: string, name: string, options?: CustomToolStorageOptions): void {
    const dirs = this.getCandidateStorageDirs(username, options?.workspaceDir);
    for (const storageDir of dirs) {
      const toolDir = join(storageDir, name);
      if (existsSync(toolDir)) {
        rmSync(toolDir, { recursive: true, force: true });
      }
    }
  }
}

export const folderCustomToolStorage = new FolderCustomToolStorage();
