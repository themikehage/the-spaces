import { useEffect, useCallback, useRef, useState } from "react";
import { wsClient, type AgentEvent, type ConnectionState } from "../api/ws.ts";

export function useWebSocket(sessionId: string | null, onEvent: (event: AgentEvent) => void) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("closed");

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const stableHandler = useCallback((event: AgentEvent) => {
    onEventRef.current(event);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    wsClient.connect(sessionId);
    const unsubEvent = wsClient.onEvent(stableHandler);
    const unsubState = wsClient.onStateChange((st) => setConnectionState(st));

    return () => {
      unsubEvent();
      unsubState();
    };
  }, [sessionId, stableHandler]);

  const send = useCallback((msg: { type: "prompt"; message: string } | { type: "abort" }) => {
    wsClient.send(msg);
  }, []);

  return { send, connectionState };
}
