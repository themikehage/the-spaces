// SPDX-License-Identifier: MIT
import { type ArtifactMetadata, type IArtifactStore } from "@spaces/core";
import { existsSync, mkdirSync } from "node:fs";
import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export class FileArtifactStore implements IArtifactStore {
  constructor(private readonly baseArtifactsDir: string) {}

  private resolvePath(filename: string): string {
    return join(this.baseArtifactsDir, filename);
  }

  async save(sessionId: string, filename: string, content: Buffer | string): Promise<string> {
    const sessionDir = join(this.baseArtifactsDir, sessionId);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }
    const fullPath = join(sessionDir, filename);
    await writeFile(fullPath, content);
    return fullPath;
  }

  async read(path: string): Promise<Buffer> {
    return await readFile(path);
  }

  async list(prefix: string): Promise<ArtifactMetadata[]> {
    const targetDir = join(this.baseArtifactsDir, prefix);
    if (!existsSync(targetDir)) return [];

    const entries = await readdir(targetDir, { withFileTypes: true });
    const results: ArtifactMetadata[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = join(targetDir, entry.name);
        const stats = await stat(fullPath);
        results.push({
          path: fullPath,
          filename: entry.name,
          sizeBytes: stats.size,
          updatedAt: stats.mtime.toISOString(),
        });
      }
    }
    return results;
  }

  async delete(path: string): Promise<void> {
    if (existsSync(path)) {
      await unlink(path);
    }
  }

  async getUrl(path: string): Promise<string> {
    return path;
  }
}
