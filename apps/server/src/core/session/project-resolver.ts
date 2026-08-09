// SPDX-License-Identifier: MIT
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getProjectsDir } from "shared";

function readProjectJson(projectPath: string): Record<string, unknown> | null {
  const filePath = join(projectPath, "project.json");
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export function resolveProjectDir(username: string, nameOrId: string): string | null {
  const projectsDir = getProjectsDir(username);
  if (!existsSync(projectsDir)) return null;
  const entries = readdirSync(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const projPath = join(projectsDir, entry.name);
    const proj = readProjectJson(projPath);
    if (proj && (proj.id === nameOrId || proj.name === nameOrId)) {
      return projPath;
    }
  }
  return null;
}

export function resolveProjectId(username: string, nameOrId: string): string | null {
  const projectsDir = getProjectsDir(username);
  if (!existsSync(projectsDir)) return null;
  const entries = readdirSync(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const projPath = join(projectsDir, entry.name);
    const proj = readProjectJson(projPath);
    if (proj && (proj.id === nameOrId || proj.name === nameOrId)) {
      return entry.name;
    }
  }
  return null;
}

export function resolveCanonicalProjectId(username: string, projectId: string): string {
  try {
    const projectDir = resolveProjectDir(username, projectId);
    if (projectDir) {
      const meta = readProjectJson(projectDir);
      if (meta?.id && typeof meta.id === "string") {
        return meta.id;
      }
    }
  } catch (e) {
    console.error("[WorkspaceResolver] Failed to resolve canonical projectId:", e);
  }
  return projectId;
}
