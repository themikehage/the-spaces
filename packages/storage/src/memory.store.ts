import type { ISessionStore, MessageRecord, SessionData } from "@spaces/core";

export class MemorySessionStore implements ISessionStore {
  private readonly sessions = new Map<string, SessionData>();
  private readonly messages = new Map<string, MessageRecord[]>();

  async create(id: string, name?: string): Promise<SessionData> {
    const now = new Date().toISOString();
    const session: SessionData = {
      id,
      name: name ?? `Session ${id.slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(id, session);
    this.messages.set(id, []);
    return session;
  }

  async appendMessage(sessionId: string, message: MessageRecord): Promise<void> {
    const list = this.messages.get(sessionId) ?? [];
    list.push(message);
    this.messages.set(sessionId, list);

    const session = this.sessions.get(sessionId);
    if (session) {
      session.updatedAt = new Date().toISOString();
    }
  }

  async getMessages(sessionId: string): Promise<MessageRecord[]> {
    return this.messages.get(sessionId) ?? [];
  }

  async listSessions(): Promise<SessionData[]> {
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.messages.delete(sessionId);
  }
}
