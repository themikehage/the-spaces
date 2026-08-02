// SPDX-License-Identifier: MIT
import { useSessions as useSessionsHook } from "@/hooks/useSessions";
import { wsClient } from "@/lib/ws-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SessionStatus = "active" | "streaming" | "task-running" | "sleeping";
export type KanbanColumn = "idle" | "working" | "done";

export interface SessionItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  status?: SessionStatus;
  projectId?: string;
  agentId?: string;
  teamId?: string;
  experimentId?: string;
  isExecution?: boolean;
  archived?: boolean;
}

export interface SessionsContextType {
  sessions: SessionItem[];
  statuses: Record<string, SessionStatus>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  totalCount: number;
  workingCount: number;
  idleCount: number;
  doneCount: number;
  workingSessions: SessionItem[];
  idleSessions: SessionItem[];
  doneSessions: SessionItem[];
  getAgentStatus: (agentId: string) => SessionStatus | null;
  getAgentKanbanStatus: (agentId: string) => KanbanColumn | "unknown";
  getChannelMemberStatus: (memberId: string) => SessionStatus | null;
  getChannelMemberKanbanStatus: (memberId: string) => KanbanColumn | "unknown";
}

const SessionsContext = createContext<SessionsContextType | null>(null);

export function SessionsProvider({ children }: { children: ReactNode }) {
  const base = useSessionsHook();
  const [statuses, setStatuses] = useState<Record<string, SessionStatus>>({});

  useEffect(() => {
    return wsClient.subscribe("session_status", (data: unknown) => {
      const d = data as { sessionId: string; status: SessionStatus };
      if (d?.sessionId && d?.status) {
        setStatuses((prev) => ({ ...prev, [d.sessionId]: d.status }));
      }
    });
  }, []);

  const mergedSessions = useMemo(() => {
    return (base.sessions as unknown as SessionItem[]).map((s) => ({
      ...s,
      status: statuses[s.id] || s.status || "sleeping",
    }));
  }, [base.sessions, statuses]);

  const derived = useMemo(() => {
    const working: SessionItem[] = [];
    const idle: SessionItem[] = [];
    const done: SessionItem[] = [];
    for (const s of mergedSessions) {
      if (s.isExecution) done.push(s);
      else if (s.status === "streaming" || s.status === "active" || s.status === "task-running")
        working.push(s);
      else idle.push(s);
    }
    return {
      workingSessions: working,
      idleSessions: idle,
      doneSessions: done,
      workingCount: working.length,
      idleCount: idle.length,
      doneCount: done.length,
      totalCount: mergedSessions.length,
    };
  }, [mergedSessions]);

  const getAgentStatus = useCallback(
    (agentId: string): SessionStatus | null => {
      const agentSessions = mergedSessions.filter((s) => s.agentId === agentId);
      if (agentSessions.length === 0) return null;
      const priority: SessionStatus[] = ["streaming", "task-running", "active", "sleeping"];
      for (const p of priority) {
        if (agentSessions.some((s) => s.status === p)) return p;
      }
      return "sleeping";
    },
    [mergedSessions],
  );

  const getAgentKanbanStatus = useCallback(
    (agentId: string): KanbanColumn | "unknown" => {
      const status = getAgentStatus(agentId);
      return !status || status === "sleeping" ? "idle" : "working";
    },
    [getAgentStatus],
  );

  const value: SessionsContextType = useMemo(
    () => ({
      sessions: mergedSessions,
      statuses,
      loading: base.loading,
      error: base.error,
      refetch: base.refresh,
      ...derived,
      getAgentStatus,
      getAgentKanbanStatus,
      getChannelMemberStatus: getAgentStatus,
      getChannelMemberKanbanStatus: getAgentKanbanStatus,
    }),
    [
      mergedSessions,
      statuses,
      base.loading,
      base.error,
      base.refresh,
      derived,
      getAgentStatus,
      getAgentKanbanStatus,
    ],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions(): SessionsContextType {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error("useSessions must be used within SessionsProvider");
  return ctx;
}
