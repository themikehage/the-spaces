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

export type MemoryType = "semantic" | "episodic" | "procedural";

export interface RecalledMemory {
  id: string;
  content: string;
  type: MemoryType;
  importance: number;
  tags?: string[];
  sessionId?: string;
}

export interface RecallOptions {
  limit?: number;
  minImportance?: number;
  types?: MemoryType[];
  sessionId?: string;
  excludeSessionId?: string;
}

export interface IMemoryStore {
  recall(query: string, opts?: RecallOptions): Promise<RecalledMemory[]>;
  store(
    content: string,
    type: MemoryType,
    importance?: number,
    tags?: string[],
    sessionId?: string,
  ): Promise<void>;
  forget(id: string): Promise<void>;
  clear?(): Promise<void>;
  buildContext(query: string, opts?: { sessionId?: string }): Promise<string>;
  shutdown(): Promise<void>;
}
