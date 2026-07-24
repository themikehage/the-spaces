// SPDX-License-Identifier: MIT

export interface ArtifactMetadata {
  path: string;
  filename: string;
  sizeBytes: number;
  updatedAt: string;
  mimeType?: string;
}

export interface IArtifactStore {
  save(sessionId: string, filename: string, content: Buffer | string): Promise<string>;
  read(path: string): Promise<Buffer>;
  list(prefix: string): Promise<ArtifactMetadata[]>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
}
