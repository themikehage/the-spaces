import type { AgentMessage, ISessionStore, SessionData } from "@auto-browser/core";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

interface SessionHeader {
  type: "session";
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageEntry {
  type: "message";
  message: AgentMessage;
}

type JournalEntry = SessionHeader | MessageEntry;

export class FilesystemSessionStore implements ISessionStore {
  private dir: string;

  constructor(dir: string) {
    this.dir = dir;
    mkdirSync(dir, { recursive: true });
  }

  private sessionPath(id: string): string {
    return join(this.dir, `${id}.jsonl`);
  }

  private readJournal(id: string): JournalEntry[] {
    const path = this.sessionPath(id);
    if (!existsSync(path)) return [];

    return readFileSync(path, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as JournalEntry);
  }

  private getHeader(id: string): SessionHeader | null {
    const entries = this.readJournal(id);
    const header = entries[0];
    return header?.type === "session" ? header : null;
  }

  async createSession(id: string, name?: string): Promise<SessionData> {
    const now = new Date().toISOString();
    const header: SessionHeader = {
      type: "session",
      id,
      name: name ?? `Session ${id.slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };

    appendFileSync(this.sessionPath(id), JSON.stringify(header) + "\n", "utf-8");

    return {
      id: header.id,
      name: header.name,
      createdAt: header.createdAt,
      updatedAt: header.updatedAt,
    };
  }

  async getMessages(sessionId: string): Promise<AgentMessage[]> {
    return this.readJournal(sessionId)
      .filter((e): e is MessageEntry => e.type === "message")
      .map((e) => e.message);
  }

  async appendMessage(sessionId: string, message: AgentMessage): Promise<void> {
    const entry: MessageEntry = { type: "message", message };
    appendFileSync(this.sessionPath(sessionId), JSON.stringify(entry) + "\n", "utf-8");
  }

  async listSessions(): Promise<SessionData[]> {
    if (!existsSync(this.dir)) return [];

    const files = readdirSync(this.dir).filter((f) => f.endsWith(".jsonl"));
    const sessions: SessionData[] = [];

    for (const file of files) {
      const id = file.replace(".jsonl", "");
      const header = this.getHeader(id);
      if (header) {
        sessions.push({
          id: header.id,
          name: header.name,
          createdAt: header.createdAt,
          updatedAt: header.updatedAt,
        });
      }
    }

    return sessions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async deleteSession(sessionId: string): Promise<void> {
    const path = this.sessionPath(sessionId);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}
