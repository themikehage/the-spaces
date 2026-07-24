// SPDX-License-Identifier: MIT
import {
  type ISessionStore,
  type SessionData,
  type MessageRecord,
  type SessionSummary,
  type SessionListQueryFilters,
} from "shared";

export class MemorySessionStore implements ISessionStore {
  private sessions = new Map<string, SessionData>();
  private messages = new Map<string, MessageRecord[]>();

  async create(session: SessionData): Promise<void> {
    this.sessions.set(session.id, session);
    if (session.messages) {
      this.messages.set(session.id, [...session.messages]);
    } else if (!this.messages.has(session.id)) {
      this.messages.set(session.id, []);
    }
  }

  async appendMessage(sessionId: string, msg: MessageRecord): Promise<void> {
    const list = this.messages.get(sessionId) || [];
    list.push(msg);
    this.messages.set(sessionId, list);
  }

  async getMessages(sessionId: string, opts?: { limit?: number; offset?: number }): Promise<MessageRecord[]> {
    const list = this.messages.get(sessionId) || [];
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? list.length;
    return list.slice(offset, offset + limit);
  }

  async listUserSessions(username: string, query?: SessionListQueryFilters): Promise<SessionSummary[]> {
    const results: SessionSummary[] = [];
    for (const session of this.sessions.values()) {
      if (session.username === username) {
        const msgs = this.messages.get(session.id) || [];
        results.push({
          id: session.id,
          name: (session.metadata?.name as string) || session.id,
          createdAt: (session.metadata?.createdAt as string) || new Date().toISOString(),
          updatedAt: (session.metadata?.updatedAt as string) || new Date().toISOString(),
          messageCount: msgs.length,
          status: "active",
        });
      }
    }
    return results;
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.messages.delete(sessionId);
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }
}
