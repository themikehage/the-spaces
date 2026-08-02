import type { ContentBlock, MessageRole } from "../types.js";

export interface SessionData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  role: MessageRole;
  content: string | ContentBlock[];
  createdAt: string;
}

export interface ISessionStore {
  create(id: string, name?: string): Promise<SessionData>;
  appendMessage(sessionId: string, message: MessageRecord): Promise<void>;
  getMessages(sessionId: string): Promise<MessageRecord[]>;
  listSessions(): Promise<SessionData[]>;
  delete(sessionId: string): Promise<void>;
}
