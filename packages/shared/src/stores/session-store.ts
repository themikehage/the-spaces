import type { SessionStatus } from "../schemas";

export interface SessionSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  status?: SessionStatus;
  projectId?: string;
  agentId?: string;
  teamId?: string;
  isExecution?: boolean;
  totalTokens?: number;
  toolCallCount?: number;
  durationMs?: number;
  modelId?: string;
  errorCount?: number;
  executionId?: string;
  turnCount?: number;
  schedulingMode?: string;
  archived?: boolean;
}

export interface SessionListQueryFilters {
  search?: string;
  agentId?: string;
  teamId?: string;
  projectId?: string;
  status?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortDir?: string;
  isExecution?: boolean;
  archived?: boolean | string;
}

export interface MessageRecord {
  id?: string;
  role: string;
  content: unknown;
  timestamp?: string;
  [key: string]: unknown;
}

export interface SessionData {
  id: string;
  username: string;
  metadata?: Record<string, unknown>;
  messages?: MessageRecord[];
}

export interface ISessionStore {
  create(session: SessionData): Promise<void>;
  appendMessage(sessionId: string, msg: MessageRecord, username?: string): Promise<void>;
  getMessages(
    sessionId: string,
    opts?: { limit?: number; offset?: number; username?: string },
  ): Promise<MessageRecord[]>;
  listUserSessions(username: string, query?: SessionListQueryFilters): Promise<SessionSummary[]>;
  delete(sessionId: string, username?: string): Promise<void>;
  exists(sessionId: string, username?: string): Promise<boolean>;
}
