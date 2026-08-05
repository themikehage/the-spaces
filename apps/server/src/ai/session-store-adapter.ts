// SPDX-License-Identifier: MIT
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getSessionDir, getUserDir } from "shared";
import type {
  ISessionStore,
  MessageRecord,
  SessionData,
  SessionListQueryFilters,
  SessionSummary,
} from "../core/ports/session-store.port";
import { JsonlSessionStore } from "./session-persistence";

export class SessionStoreAdapter implements ISessionStore {
  create(session: SessionData): Promise<void> {
    const sessionDir = getSessionDir(session.username, session.id);
    JsonlSessionStore.create(sessionDir, sessionDir);
    return Promise.resolve();
  }

  async appendMessage(sessionId: string, msg: MessageRecord): Promise<void> {
    return Promise.resolve();
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
    const userDir = getUserDir(username);
    const sessionsDir = join(userDir, "sessions");
    if (!existsSync(sessionsDir)) return [];

    const dirs = readdirSync(sessionsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const summaries: SessionSummary[] = [];
    for (const id of dirs) {
      summaries.push({
        id,
        name: id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      });
    }
    return summaries;
  }

  async delete(sessionId: string): Promise<void> {
    return Promise.resolve();
  }

  async exists(sessionId: string): Promise<boolean> {
    return true;
  }
}
