import type { IMemoryProvider, MemoryEntry } from "@spaces/core";

export class EngramMemoryProvider implements IMemoryProvider {
  private memories: MemoryEntry[] = [];

  async search(query: string, limit = 5): Promise<MemoryEntry[]> {
    const q = query.toLowerCase();
    return this.memories
      .filter((m) => m.content.toLowerCase().includes(q))
      .slice(0, limit);
  }

  async store(entry: Omit<MemoryEntry, "id">): Promise<string> {
    const id = crypto.randomUUID();
    const newEntry: MemoryEntry = {
      ...entry,
      id,
    };
    this.memories.push(newEntry);
    return id;
  }

  async delete(id: string): Promise<void> {
    const idx = this.memories.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.memories.splice(idx, 1);
    }
  }
}
