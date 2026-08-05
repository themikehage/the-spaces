import type { AgentMessage, ISessionStore, SessionData } from "@auto-browser/core";

export class MemorySessionStore implements ISessionStore {
  private sessions = new Map<string, SessionData>();
  private messages = new Map<string, AgentMessage[]>();

  async createSession(id: string, name?: string): Promise<SessionData> {
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

  async getMessages(sessionId: string): Promise<AgentMessage[]> {
    return this.messages.get(sessionId) ?? [];
  }

  async appendMessage(sessionId: string, message: AgentMessage): Promise<void> {
    const msgs = this.messages.get(sessionId);
    if (!msgs) {
      throw new Error(`Session "${sessionId}" not found`);
    }
    msgs.push(message);

    const session = this.sessions.get(sessionId);
    if (session) {
      session.updatedAt = new Date().toISOString();
    }
  }

  async listSessions(): Promise<SessionData[]> {
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.messages.delete(sessionId);
  }
}
