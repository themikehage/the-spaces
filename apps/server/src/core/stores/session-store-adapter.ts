// SPDX-License-Identifier: MIT
import type {
  ISessionStore,
  MessageRecord,
  SessionData,
  SessionListQueryFilters,
  SessionSummary,
} from "../ports/session-store.port";
import { FilesystemSessionStore } from "./filesystem-session-store";

export class SessionStoreAdapter implements ISessionStore {
  private innerStore: FilesystemSessionStore;

  constructor(baseSessionsDir?: string) {
    this.innerStore = new FilesystemSessionStore(baseSessionsDir);
  }

  async create(session: SessionData): Promise<void> {
    return this.innerStore.create(session);
  }

  async appendMessage(sessionId: string, msg: MessageRecord, username?: string): Promise<void> {
    return this.innerStore.appendMessage(sessionId, msg, username);
  }

  async getMessages(
    sessionId: string,
    opts?: { limit?: number; offset?: number; username?: string },
  ): Promise<MessageRecord[]> {
    return this.innerStore.getMessages(sessionId, opts);
  }

  async listUserSessions(
    username: string,
    query?: SessionListQueryFilters,
  ): Promise<SessionSummary[]> {
    return this.innerStore.listUserSessions(username, query);
  }

  async delete(sessionId: string, username?: string): Promise<void> {
    return this.innerStore.delete(sessionId, username);
  }

  async exists(sessionId: string, username?: string): Promise<boolean> {
    return this.innerStore.exists(sessionId, username);
  }
}
