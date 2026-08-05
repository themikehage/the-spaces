export interface MemoryEntry {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  score?: number;
}

export interface IMemoryProvider {
  search(query: string, limit?: number): Promise<MemoryEntry[]>;
  save(content: string, metadata?: Record<string, unknown>): Promise<string>;
  delete(id: string): Promise<void>;
}
