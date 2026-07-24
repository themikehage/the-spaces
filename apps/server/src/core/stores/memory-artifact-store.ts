// SPDX-License-Identifier: MIT
import { type IArtifactStore, type ArtifactMetadata } from "shared";

export class MemoryArtifactStore implements IArtifactStore {
  private artifacts = new Map<string, { content: Buffer; metadata: ArtifactMetadata }>();

  async save(sessionId: string, filename: string, content: Buffer | string): Promise<string> {
    const path = `${sessionId}/${filename}`;
    const buf = typeof content === "string" ? Buffer.from(content) : content;
    const metadata: ArtifactMetadata = {
      path,
      filename,
      sizeBytes: buf.length,
      updatedAt: new Date().toISOString(),
    };
    this.artifacts.set(path, { content: buf, metadata });
    return path;
  }

  async read(path: string): Promise<Buffer> {
    const item = this.artifacts.get(path);
    if (!item) {
      throw new Error(`Artifact not found at path: ${path}`);
    }
    return item.content;
  }

  async list(prefix: string): Promise<ArtifactMetadata[]> {
    const results: ArtifactMetadata[] = [];
    for (const [path, item] of this.artifacts.entries()) {
      if (path.startsWith(prefix)) {
        results.push(item.metadata);
      }
    }
    return results;
  }

  async delete(path: string): Promise<void> {
    this.artifacts.delete(path);
  }

  async getUrl(path: string): Promise<string> {
    return `memory://${path}`;
  }
}
