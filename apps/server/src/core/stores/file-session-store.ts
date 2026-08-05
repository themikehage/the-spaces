// SPDX-License-Identifier: MIT
import { existsSync } from "node:fs";
import { appendFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type ISessionStore,
  type MessageRecord,
  type SessionData,
  type SessionListQueryFilters,
  type SessionSummary,
  getSessionsDir,
  SessionPrefix,
} from "shared";

export class FileSessionStore implements ISessionStore {
  private locks = new Map<string, Promise<void>>();

  constructor(private readonly baseSessionsDir?: string) {}

  private resolveUserSessionsDir(username?: string): string {
    return this.baseSessionsDir || getSessionsDir(username || "default");
  }

  private resolveSessionDir(sessionId: string, username?: string): string {
    if (this.baseSessionsDir) {
      const directPath = join(this.baseSessionsDir, sessionId);
      if (existsSync(directPath)) {
        return directPath;
      }
    }
    return join(this.resolveUserSessionsDir(username), sessionId);
  }

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) || Promise.resolve();
    let resolveLock!: () => void;
    const current = new Promise<void>((res) => {
      resolveLock = res;
    });
    this.locks.set(
      key,
      previous.then(() => current),
    );
    try {
      await previous;
      return await fn();
    } finally {
      resolveLock();
      if (this.locks.get(key) === current) {
        this.locks.delete(key);
      }
    }
  }

  async create(session: SessionData): Promise<void> {
    const dir = this.resolveSessionDir(session.id, session.username);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const metadata = {
      id: session.id,
      username: session.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: session.messages?.length || 0,
      ...(session.metadata || {}),
    };

    const metadataPath = join(dir, "metadata.json");
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

    if (session.messages && session.messages.length > 0) {
      const logPath = join(dir, "messages.jsonl");
      const lines =
        session.messages.map((m) => JSON.stringify({ type: "message", message: m })).join("\n") +
        "\n";
      await writeFile(logPath, lines, "utf-8");
    }
  }

  async appendMessage(sessionId: string, msg: MessageRecord, username?: string): Promise<void> {
    return this.withLock(sessionId, async () => {
      const dir = this.resolveSessionDir(sessionId, username);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      const logPath = join(dir, "messages.jsonl");
      const line = JSON.stringify({ type: "message", message: msg }) + "\n";
      await appendFile(logPath, line, "utf-8");

      const metadataPath = join(dir, "metadata.json");
      let metadata: Record<string, unknown> = {
        id: sessionId,
        username: username || "default",
        createdAt: new Date().toISOString(),
        messageCount: 0,
      };

      if (existsSync(metadataPath)) {
        try {
          const content = await readFile(metadataPath, "utf-8");
          metadata = JSON.parse(content);
        } catch {
          /* ignore corrupted metadata */
        }
      }

      const currentCount = typeof metadata.messageCount === "number" ? metadata.messageCount : 0;
      metadata.messageCount = currentCount + 1;
      metadata.updatedAt = new Date().toISOString();

      await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
    });
  }

  async getMessages(
    sessionId: string,
    opts?: { limit?: number; offset?: number; username?: string },
  ): Promise<MessageRecord[]> {
    const dir = this.resolveSessionDir(sessionId, opts?.username);
    if (!existsSync(dir)) return [];

    let logPath = join(dir, "messages.jsonl");
    if (!existsSync(logPath)) {
      const legacyPath = join(dir, "session.jsonl");
      if (existsSync(legacyPath)) {
        logPath = legacyPath;
      } else {
        return [];
      }
    }

    try {
      const content = await readFile(logPath, "utf-8");
      const lines = content.split("\n");
      const messages: MessageRecord[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === "object") {
            if (parsed.type === "message" && parsed.message) {
              messages.push(parsed.message as MessageRecord);
            } else if (parsed.role && parsed.content !== undefined) {
              messages.push(parsed as MessageRecord);
            }
          }
        } catch {
          /* ignore malformed lines */
        }
      }

      const offset = opts?.offset ?? 0;
      const limit = opts?.limit ?? messages.length;
      return messages.slice(offset, offset + limit);
    } catch {
      return [];
    }
  }

  async listUserSessions(
    username: string,
    query?: SessionListQueryFilters,
  ): Promise<SessionSummary[]> {
    const sessionsDir = this.resolveUserSessionsDir(username);
    if (!existsSync(sessionsDir)) return [];

    try {
      const entries = await readdir(sessionsDir, { withFileTypes: true });
      const sessionPromises = entries
        .filter(
          (entry) =>
            entry.isDirectory() &&
            !entry.name.startsWith("plan_") &&
            !entry.name.startsWith(SessionPrefix.SUBAGENT),
        )
        .map(async (entry): Promise<SessionSummary> => {
          const sessionId = entry.name;
          const sessionSubdir = join(sessionsDir, sessionId);
          const metadataPath = join(sessionSubdir, "metadata.json");

          let metadata: Record<string, unknown> = {};
          if (existsSync(metadataPath)) {
            try {
              const metaContent = await readFile(metadataPath, "utf-8");
              metadata = JSON.parse(metaContent);
            } catch {
              /* noop */
            }
          }

          let messageCount = typeof metadata.messageCount === "number" ? metadata.messageCount : 0;
          if (messageCount === 0) {
            const msgs = await this.getMessages(sessionId, { username });
            messageCount = msgs.length;
          }

          return {
            id: sessionId,
            name: typeof metadata.name === "string" ? metadata.name : sessionId,
            createdAt:
              typeof metadata.createdAt === "string"
                ? metadata.createdAt
                : new Date().toISOString(),
            updatedAt:
              typeof metadata.updatedAt === "string"
                ? metadata.updatedAt
                : new Date().toISOString(),
            messageCount,
            status: (metadata.status as any) || "sleeping",
            projectId: metadata.projectId as string | undefined,
            agentId: metadata.agentId as string | undefined,
            teamId: metadata.teamId as string | undefined,
            isExecution: Boolean(metadata.isExecution),
            archived: Boolean(metadata.archived),
          };
        });

      let items = await Promise.all(sessionPromises);

      if (query?.search) {
        const term = query.search.toLowerCase();
        items = items.filter(
          (s) => s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term),
        );
      }
      if (query?.projectId) {
        items = items.filter((s) => s.projectId === query.projectId);
      }
      if (query?.agentId) {
        items = items.filter((s) => s.agentId === query.agentId);
      }
      if (query?.teamId) {
        items = items.filter((s) => s.teamId === query.teamId);
      }
      if (query?.status) {
        items = items.filter((s) => s.status === query.status);
      }
      if (query?.archived !== undefined) {
        const isArchivedBool = String(query.archived) === "true";
        items = items.filter((s) => Boolean(s.archived) === isArchivedBool);
      }

      items.sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
      );

      return items;
    } catch {
      return [];
    }
  }

  async delete(sessionId: string, username?: string): Promise<void> {
    const dir = this.resolveSessionDir(sessionId, username);
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true });
    }
  }

  async exists(sessionId: string, username?: string): Promise<boolean> {
    const dir = this.resolveSessionDir(sessionId, username);
    if (!existsSync(dir)) return false;
    const metadataPath = join(dir, "metadata.json");
    const messagesPath = join(dir, "messages.jsonl");
    const legacyPath = join(dir, "session.jsonl");
    return existsSync(metadataPath) || existsSync(messagesPath) || existsSync(legacyPath);
  }
}

export class FilesystemSessionStore extends FileSessionStore {}
