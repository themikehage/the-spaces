import type { ISessionStore, MessageRecord, SessionData } from "@spaces/core";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface FileHeader {
  type: "header";
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface FileMessageEntry {
  type: "message";
  message: MessageRecord;
}

type FileLine = FileHeader | FileMessageEntry;

export class FilesystemSessionStore implements ISessionStore {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private async ensureDir(): Promise<void> {
    if (!existsSync(this.baseDir)) {
      await mkdir(this.baseDir, { recursive: true });
    }
  }

  private getFilePath(sessionId: string): string {
    return join(this.baseDir, `${sessionId}.jsonl`);
  }

  async create(id: string, name?: string): Promise<SessionData> {
    await this.ensureDir();
    const filePath = this.getFilePath(id);
    const now = new Date().toISOString();

    const session: SessionData = {
      id,
      name: name ?? `Session ${id.slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };

    const header: FileHeader = {
      type: "header",
      ...session,
    };

    await writeFile(filePath, JSON.stringify(header) + "\n", "utf-8");
    return session;
  }

  async appendMessage(sessionId: string, message: MessageRecord): Promise<void> {
    await this.ensureDir();
    const filePath = this.getFilePath(sessionId);

    if (!existsSync(filePath)) {
      await this.create(sessionId);
    }

    const entry: FileMessageEntry = {
      type: "message",
      message,
    };

    await appendFile(filePath, JSON.stringify(entry) + "\n", "utf-8");
  }

  async getMessages(sessionId: string): Promise<MessageRecord[]> {
    const filePath = this.getFilePath(sessionId);
    if (!existsSync(filePath)) return [];

    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");
    const messages: MessageRecord[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed) as FileLine;
        if (parsed.type === "message" && parsed.message) {
          messages.push(parsed.message);
        }
      } catch {
        // Skip malformed lines
      }
    }

    return messages;
  }

  async listSessions(): Promise<SessionData[]> {
    await this.ensureDir();
    const files = await readdir(this.baseDir);
    const sessions: SessionData[] = [];

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;
      const filePath = join(this.baseDir, file);

      try {
        const content = await readFile(filePath, "utf-8");
        const firstLine = content.split("\n")[0]?.trim();
        if (!firstLine) continue;

        const header = JSON.parse(firstLine) as FileLine;
        if (header.type === "header") {
          sessions.push({
            id: header.id,
            name: header.name,
            createdAt: header.createdAt,
            updatedAt: header.updatedAt,
          });
        }
      } catch {
        // Skip invalid session files
      }
    }

    return sessions.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async delete(sessionId: string): Promise<void> {
    const filePath = this.getFilePath(sessionId);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }
}
