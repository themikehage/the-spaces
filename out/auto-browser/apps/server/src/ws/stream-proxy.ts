import type { ServerWebSocket } from "bun";
import { join } from "node:path";
import { homedir } from "node:os";
import { readFile } from "node:fs/promises";

interface StreamSession {
  port: number;
  upstreamWs: WebSocket | null;
  clients: Set<ServerWebSocket<StreamWsData>>;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

export interface StreamWsData {
  sessionId: string;
}

const sessions = new Map<string, StreamSession>();

export function registerStreamPort(sessionId: string, port: number): void {
  const existing = sessions.get(sessionId);
  if (existing) {
    if (existing.port === port) return;
    teardownUpstream(existing);
    existing.port = port;
    existing.upstreamWs = null;
    connectUpstream(sessionId, existing);
  } else {
    const session: StreamSession = { port, upstreamWs: null, clients: new Set() };
    sessions.set(sessionId, session);
    connectUpstream(sessionId, session);
  }
}

export function unregisterStream(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  teardownUpstream(session);
  sessions.delete(sessionId);
}

async function discoverSessionPort(sessionId: string): Promise<number | null> {
  try {
    const streamFile = join(homedir(), ".agent-browser", `${sessionId}.stream`);
    const content = await readFile(streamFile, "utf-8");
    const port = parseInt(content.trim(), 10);
    return isNaN(port) ? null : port;
  } catch {
    return null;
  }
}

export const streamWsHandler = {
  async open(ws: ServerWebSocket<StreamWsData>) {
    const { sessionId } = ws.data;
    let session = sessions.get(sessionId);

    if (!session) {
      // Auto-discover port from ~/.agent-browser/<sessionId>.stream
      const port = await discoverSessionPort(sessionId);
      if (port) {
        const newSession: StreamSession = { port, upstreamWs: null, clients: new Set() };
        sessions.set(sessionId, newSession);
        session = newSession;
        connectUpstream(sessionId, newSession);
      }
    }

    if (!session) {
      ws.send(
        JSON.stringify({
          type: "status",
          connected: false,
          screencasting: false,
          error: "No stream available for this session",
        }),
      );
      return;
    }
    session.clients.add(ws);
    ws.send(
      JSON.stringify({
        type: "status",
        connected: session.upstreamWs?.readyState === WebSocket.OPEN,
        screencasting: false,
      }),
    );
  },

  message(_ws: ServerWebSocket<StreamWsData>, _raw: string | Buffer) {
    // viewer-only: ignore all input from client
  },

  close(ws: ServerWebSocket<StreamWsData>) {
    const session = sessions.get(ws.data.sessionId);
    session?.clients.delete(ws);
  },
};

function connectUpstream(sessionId: string, session: StreamSession): void {
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = undefined;
  }

  try {
    const ws = new WebSocket(`ws://127.0.0.1:${session.port}`);
    session.upstreamWs = ws;

    ws.onopen = () => {
      broadcast(session, JSON.stringify({ type: "status", connected: true, screencasting: false }));
    };

    ws.onmessage = (event) => {
      const data = typeof event.data === "string" ? event.data : null;
      if (!data) return;
      broadcast(session, data);
    };

    ws.onerror = () => {
      scheduleReconnect(sessionId, session);
    };

    ws.onclose = () => {
      session.upstreamWs = null;
      broadcast(
        session,
        JSON.stringify({ type: "status", connected: false, screencasting: false }),
      );
      scheduleReconnect(sessionId, session);
    };
  } catch {
    scheduleReconnect(sessionId, session);
  }
}

function scheduleReconnect(sessionId: string, session: StreamSession): void {
  if (!sessions.has(sessionId)) return;
  if (session.clients.size === 0) return;
  session.reconnectTimer = setTimeout(() => {
    if (sessions.has(sessionId) && session.clients.size > 0) {
      connectUpstream(sessionId, session);
    }
  }, 3000);
}

function teardownUpstream(session: StreamSession): void {
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = undefined;
  }
  if (session.upstreamWs) {
    try {
      session.upstreamWs.close();
    } catch (_) {}
    session.upstreamWs = null;
  }
}

function broadcast(session: StreamSession, data: string): void {
  for (const client of session.clients) {
    try {
      if (client.readyState === 1) {
        client.send(data);
      }
    } catch (_) {}
  }
}
