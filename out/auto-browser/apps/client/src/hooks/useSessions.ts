import { useState, useCallback, useEffect } from "react";
import { api, type Session } from "../api/client.ts";

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.sessions.list();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (name?: string): Promise<Session | null> => {
    try {
      const session = await api.sessions.create(name);
      setSessions((prev) => [session, ...prev]);
      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      await api.sessions.delete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { sessions, loading, error, load, create, remove };
}
