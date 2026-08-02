// SPDX-License-Identifier: MIT
import { apiFetch } from "@/api/client";
import type { SessionData } from "@spaces/core";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "spaces_selected_session_id";

export interface UseSessionsResult {
  sessions: SessionData[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  select: (id: string | null) => void;
  create: (name?: string) => Promise<SessionData>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    try {
      if (id) {
        sessionStorage.setItem(STORAGE_KEY, id);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SessionData[]>("/sessions");
      const list = Array.isArray(data) ? data : [];
      setSessions(list);
      if (selectedId && !list.some((s) => s.id === selectedId)) {
        select(list[0]?.id ?? null);
      } else if (!selectedId && list.length > 0) {
        select(list[0].id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load sessions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedId, select]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (name?: string): Promise<SessionData> => {
      const session = await apiFetch<SessionData>("/sessions", {
        method: "POST",
        body: JSON.stringify({ name: name || "New Session" }),
      });
      setSessions((prev) => [session, ...prev]);
      select(session.id);
      return session;
    },
    [select],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await apiFetch<{ ok: boolean }>(`/sessions/${id}`, {
        method: "DELETE",
      });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        select(remaining[0]?.id ?? null);
      }
    },
    [selectedId, sessions, select],
  );

  return {
    sessions,
    selectedId,
    loading,
    error,
    select,
    create,
    remove,
    refresh,
  };
}
