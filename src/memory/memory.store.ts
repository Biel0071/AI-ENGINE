interface MemoryEntry {
  from: string;
  message: string;
  intent: string;
  response: string;
  createdAt: string;
}

export class MemoryStore {
  private readonly entries: MemoryEntry[] = [];

  save(entry: MemoryEntry): void {
    this.entries.push(entry);
    if (this.entries.length > 2000) {
      this.entries.shift();
    }
  }

  findBySender(from: string): MemoryEntry[] {
    return this.entries.filter((entry) => entry.from === from);
  }
}
