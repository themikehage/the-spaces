import { useEffect, useRef, useState, useCallback } from "react";
import { Globe, X, Minimize2, Maximize2, RefreshCw, WifiOff, Monitor } from "lucide-react";
import { useBrowserSessions, type BrowserSessionInfo } from "../hooks/useBrowserSessions.ts";

type StreamStatus = "idle" | "connecting" | "live" | "disconnected" | "error";

export function BrowserViewerPanel() {
  const sessions = useBrowserSessions(3000);
  const [activeSession, setActiveSession] = useState<BrowserSessionInfo | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [fps, setFps] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsRef = useRef(Date.now());

  // Auto-select first active session, update if port changes
  useEffect(() => {
    if (sessions.length > 0) {
      const first = sessions[0]!;
      if (!activeSession) {
        setActiveSession(first);
        setIsDismissed(false);
      } else {
        const current = sessions.find(
          (s: BrowserSessionInfo) => s.session === activeSession.session,
        );
        if (!current) {
          setActiveSession(first);
        } else if (current.port !== activeSession.port) {
          setActiveSession(current);
        }
      }
    } else {
      setActiveSession(null);
    }
  }, [sessions]);

  const connect = useCallback((session: BrowserSessionInfo) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Connect DIRECTLY to agent-browser's stream WS port on localhost.
    // WebSocket connections have no CORS restrictions, so this works from the browser.
    const wsUrl = `ws://127.0.0.1:${session.port}`;
    console.log(`[BrowserViewerPanel] Connecting to ${wsUrl} (session: ${session.session})`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStreamStatus("connecting");

    ws.onopen = () => setStreamStatus("connecting");

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "frame" && msg.data) {
          if (imgRef.current) {
            imgRef.current.src = `data:image/jpeg;base64,${msg.data}`;
          }
          setStreamStatus("live");
          frameCountRef.current++;
          const now = Date.now();
          if (now - lastFpsRef.current >= 1000) {
            setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsRef.current)));
            frameCountRef.current = 0;
            lastFpsRef.current = now;
          }
        } else if (msg.type === "status" && msg.connected && msg.screencasting) {
          setStreamStatus("live");
        }
      } catch {}
    };

    ws.onerror = () => setStreamStatus("error");

    ws.onclose = () => {
      setStreamStatus("disconnected");
      wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!activeSession || isDismissed) {
      wsRef.current?.close();
      wsRef.current = null;
      setStreamStatus("idle");
      return;
    }
    connect(activeSession);
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [activeSession, isDismissed, connect]);

  // No sessions → hidden
  if (sessions.length === 0) return null;

  // Dismissed → show a small restore button
  if (isDismissed) {
    return (
      <button
        onClick={() => setIsDismissed(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium shadow-lg transition-all"
      >
        <Monitor className="h-3.5 w-3.5" />
        <span>Show Browser</span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>
    );
  }

  const statusConfig: Record<StreamStatus, { color: string; label: string }> = {
    idle: { color: "text-muted-foreground", label: "Idle" },
    connecting: { color: "text-amber-400", label: "Connecting..." },
    live: { color: "text-emerald-400", label: fps > 0 ? `Live · ${fps} fps` : "Live" },
    disconnected: { color: "text-muted-foreground", label: "Disconnected" },
    error: { color: "text-destructive", label: "Connection failed" },
  };

  const status = statusConfig[streamStatus];

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col rounded-xl border border-border/80 bg-[#0e0e1a] shadow-2xl overflow-hidden transition-all duration-200"
      style={{ width: isMinimized ? "280px" : "420px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a2b] border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="h-3.5 w-3.5 text-violet-400 shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">Browser Live</span>

          {sessions.length > 1 && (
            <select
              value={activeSession?.session ?? ""}
              onChange={(e) => {
                const s = sessions.find((x: BrowserSessionInfo) => x.session === e.target.value);
                if (s) setActiveSession(s);
              }}
              className="text-[10px] bg-surface border border-border/40 rounded px-1 py-0.5 text-muted-foreground max-w-[100px] truncate"
            >
              {sessions.map((s: BrowserSessionInfo) => (
                <option key={s.session} value={s.session}>
                  {s.session.slice(0, 12)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-medium flex items-center gap-1 ${status.color}`}>
            {streamStatus === "connecting" && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
            {(streamStatus === "disconnected" || streamStatus === "error") && (
              <WifiOff className="h-2.5 w-2.5" />
            )}
            {streamStatus === "live" && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {status.label}
          </span>

          {(streamStatus === "disconnected" || streamStatus === "error") && activeSession && (
            <button
              onClick={() => connect(activeSession)}
              className="p-1 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
              title="Reconnect"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}

          <button
            onClick={() => setIsMinimized((v) => !v)}
            className="p-1 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Viewport */}
      {!isMinimized && (
        <div
          className="relative bg-[#0a0a14] flex items-center justify-center"
          style={{ height: "236px" }}
        >
          <img
            ref={imgRef}
            className={`max-w-full max-h-full object-contain transition-opacity duration-75 ${
              streamStatus === "live" ? "opacity-100" : "opacity-20"
            }`}
            alt="Browser viewport"
            style={{ display: "block" }}
          />

          {streamStatus !== "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              {streamStatus === "connecting" && (
                <>
                  <RefreshCw className="h-6 w-6 text-violet-400/60 animate-spin" />
                  <span className="text-[11px] text-muted-foreground">
                    Waiting for browser stream...
                  </span>
                  {activeSession && (
                    <span className="text-[10px] text-muted-foreground/40 font-mono">
                      ws://127.0.0.1:{activeSession.port}
                    </span>
                  )}
                </>
              )}
              {(streamStatus === "disconnected" || streamStatus === "error") && (
                <>
                  <WifiOff className="h-6 w-6 text-muted-foreground/40" />
                  <span className="text-[11px] text-muted-foreground">
                    {streamStatus === "error" ? "Connection failed" : "Stream disconnected"}
                  </span>
                  {activeSession && (
                    <button
                      onClick={() => connect(activeSession)}
                      className="text-[10px] text-primary hover:text-primary/80 underline underline-offset-2"
                    >
                      Reconnect to :{activeSession.port}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
