import type { AgentMessage } from "../types.ts";

export interface SessionData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISessionStore {
  createSession(id: string, name?: string): Promise<SessionData>;
  getMessages(sessionId: string): Promise<AgentMessage[]>;
  appendMessage(sessionId: string, message: AgentMessage): Promise<void>;
  listSessions(): Promise<SessionData[]>;
  deleteSession(sessionId: string): Promise<void>;
}
