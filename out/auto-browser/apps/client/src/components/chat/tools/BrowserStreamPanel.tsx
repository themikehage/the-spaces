import { useEffect, useRef, useState, useCallback } from "react";
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface BrowserStreamPanelProps {
  sessionId: string;
  action?: string;
  url?: string;
  isStreaming?: boolean;
  isError?: boolean;
  elapsedMs?: number;
  fallbackText?: string;
}

type StreamStatus = "connecting" | "live" | "disconnected" | "error";

export function BrowserStreamPanel({
  sessionId,
  action = "navigate",
  url,
  isStreaming,
  isError,
  elapsedMs,
  fallbackText,
}: BrowserStreamPanelProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("connecting");
  const [fps, setFps] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const frameCountRef = useRef(0);
  const lastFpsTickRef = useRef(Date.now());

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/stream/${encodeURIComponent(sessionId)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStreamStatus("connecting");

    ws.onopen = () => {
      setStreamStatus("connecting");
    };

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
          const elapsed = now - lastFpsTickRef.current;
          if (elapsed >= 1000) {
            setFps(Math.round((frameCountRef.current * 1000) / elapsed));
            frameCountRef.current = 0;
            lastFpsTickRef.current = now;
          }
        } else if (msg.type === "status") {
          if (msg.connected && msg.screencasting) {
            setStreamStatus("live");
          } else if (msg.connected) {
            setStreamStatus("connecting");
          } else {
            setStreamStatus("disconnected");
          }
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      setStreamStatus("error");
    };

    ws.onclose = () => {
      setStreamStatus("disconnected");
    };
  }, [sessionId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const statusConfig: Record<
    StreamStatus,
    { color: string; label: string; icon: React.ReactNode }
  > = {
    connecting: {
      color: "text-amber-400",
      label: "Connecting...",
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
    },
    live: {
      color: "text-emerald-400",
      label: fps > 0 ? `Live · ${fps} fps` : "Live",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    disconnected: {
      color: "text-muted-foreground",
      label: "Disconnected",
      icon: <WifiOff className="h-3 w-3" />,
    },
    error: {
      color: "text-destructive",
      label: "Stream error",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  };

  const status = statusConfig[streamStatus];
  const showFallback = streamStatus !== "live" && fallbackText;

  return (
    <div
      className={`font-mono text-xs bg-[#0e0e1a] rounded-lg border border-border/70 overflow-hidden my-2 shadow-lg transition-all duration-200 ${
        isExpanded ? "fixed inset-4 z-50 my-0 rounded-xl shadow-2xl" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#1a1a2b] border-b border-border/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded bg-violet-500/10 text-violet-400">
            <Globe className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] px-1.5 py-0.5 bg-surface-hover/80 rounded border border-border/40">
            {action}
          </span>
          {url && (
            <span
              className="text-sky-400 font-medium truncate text-[11px] max-w-[240px]"
              title={url}
            >
              {url}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Elapsed time */}
          {elapsedMs !== undefined && elapsedMs > 0 && (
            <span className="text-muted-foreground/60 text-[10px]">
              {(elapsedMs / 1000).toFixed(1)}s
            </span>
          )}

          {/* Stream status pill */}
          <span className={`flex items-center gap-1.5 text-[11px] ${status.color}`}>
            {status.icon}
            <span>{status.label}</span>
          </span>

          {/* Overall action status */}
          {isStreaming ? (
            <span className="flex items-center gap-1 text-primary text-[11px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Working</span>
            </span>
          ) : isError ? (
            <span className="flex items-center gap-1 text-destructive text-[11px]">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}

          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-surface-hover"
            title={isExpanded ? "Minimize" : "Maximize"}
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div
        className={`relative bg-[#0a0a14] flex items-center justify-center overflow-hidden ${
          isExpanded ? "flex-1" : "h-64"
        }`}
        style={isExpanded ? { height: "calc(100% - 40px)" } : {}}
      >
        {/* Live frame */}
        <img
          ref={imgRef}
          className={`max-w-full max-h-full object-contain transition-opacity duration-100 ${
            streamStatus === "live" ? "opacity-100" : "opacity-30"
          }`}
          alt="Browser viewport"
          style={{ display: streamStatus === "live" || imgRef.current?.src ? "block" : "none" }}
        />

        {/* Fallback overlay */}
        {showFallback && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
            <div className={`flex items-center gap-2 text-[11px] ${status.color}`}>
              {status.icon}
              <span>{status.label}</span>
            </div>
            <pre className="text-muted-foreground text-[10px] whitespace-pre-wrap max-h-32 overflow-y-auto text-center opacity-70">
              {fallbackText}
            </pre>
            {streamStatus !== "connecting" && (
              <button
                onClick={connect}
                className="text-[10px] text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
              >
                Reconnect
              </button>
            )}
          </div>
        )}

        {/* No content yet overlay */}
        {streamStatus === "connecting" && !imgRef.current?.src && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin text-violet-400/60" />
              <span className="text-[11px]">Waiting for browser stream...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
