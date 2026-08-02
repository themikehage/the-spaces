export interface MemoryEntry {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  relevanceScore?: number;
}

export interface IMemoryProvider {
  search(query: string, limit?: number): Promise<MemoryEntry[]>;
  store(entry: Omit<MemoryEntry, "id">): Promise<string>;
  delete(id: string): Promise<void>;
}
