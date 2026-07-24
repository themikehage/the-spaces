// SPDX-License-Identifier: MIT
import { existsSync, mkdirSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
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
  constructor(private readonly baseSessionsDir?: string) {}

  private resolveUserSessionsDir(username: string): string {
    return this.baseSessionsDir || getSessionsDir(username);
  }

  private resolveSessionDir(username: string, sessionId: string): string {
    return join(this.resolveUserSessionsDir(username), sessionId);
  }

  async create(session: SessionData): Promise<void> {
    const dir = this.resolveSessionDir(session.username, session.id);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (session.metadata) {
      const metadataPath = join(dir, "metadata.json");
      await writeFile(metadataPath, JSON.stringify(session.metadata, null, 2), "utf-8");
    }
    if (session.messages && session.messages.length > 0) {
      const logPath = join(dir, "messages.jsonl");
      const lines =
        session.messages.map((m) => JSON.stringify({ type: "message", message: m })).join("\n") +
        "\n";
      await writeFile(logPath, lines, "utf-8");
    }
  }

  async appendMessage(sessionId: string, msg: MessageRecord): Promise<void> {
    // Note: session location resolution can use base directory if provided
    // For file appending, write JSON line to session log file
  }

  async getMessages(
    sessionId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<MessageRecord[]> {
    return [];
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
            } catch {}
          }

          let messageCount = typeof metadata.messageCount === "number" ? metadata.messageCount : 0;

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

      return items;
    } catch {
      return [];
    }
  }

  async delete(sessionId: string): Promise<void> {
    // Delete session directory
  }

  async exists(sessionId: string): Promise<boolean> {
    return false;
  }
}
