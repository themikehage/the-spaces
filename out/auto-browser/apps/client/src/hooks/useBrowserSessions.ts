import { useState, useEffect, useRef } from "react";

export interface BrowserSessionInfo {
  session: string;
  port: number;
  pid: number;
}

export function useBrowserSessions(pollIntervalMs = 3000) {
  const [sessions, setSessions] = useState<BrowserSessionInfo[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/browser-sessions");
      if (!res.ok) return;
      const data = (await res.json()) as BrowserSessionInfo[];
      setSessions(data);
    } catch {
      setSessions([]);
    }
  };

  useEffect(() => {
    void fetchSessions();
    timerRef.current = setInterval(() => void fetchSessions(), pollIntervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pollIntervalMs]);

  return sessions;
}
