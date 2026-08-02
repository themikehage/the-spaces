// SPDX-License-Identifier: MIT
import { WsClient, type WsInMessage, type WsOutMessage } from "@/api/ws";
import { useCallback, useEffect, useRef, useState } from "react";

type EventHandler = (data: any) => void;

interface UseWebSocketResult {
  connected: boolean;
  send: (msg: any) => void;
  subscribe: (
    typeOrHandler: string | ((event: WsInMessage) => void),
    handler?: EventHandler,
  ) => () => void;
}

export function useWebSocket(sessionId: string | null = null): UseWebSocketResult {
  const clientRef = useRef<WsClient | null>(null);
  const [connected, setConnected] = useState(false);

  if (!clientRef.current) {
    clientRef.current = new WsClient(sessionId);
  }

  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;

    client.setSessionId(sessionId);

    const unsubState = client.onStateChange((state) => {
      setConnected(state === "connected");
    });

    if (sessionId) {
      client.connect();
    }

    return () => {
      unsubState();
    };
  }, [sessionId]);

  const send = useCallback((msg: any) => {
    clientRef.current?.send(msg as WsOutMessage);
  }, []);

  const subscribe = useCallback(
    (
      typeOrHandler: string | ((event: WsInMessage) => void),
      handler?: EventHandler,
    ): (() => void) => {
      if (!clientRef.current) return () => {};
      if (typeof typeOrHandler === "function") {
        return clientRef.current.subscribe(typeOrHandler);
      }
      if (typeof typeOrHandler === "string" && handler) {
        return clientRef.current.subscribe((event: WsInMessage) => {
          if (typeOrHandler === "*" || (event && (event as any).type === typeOrHandler)) {
            handler(event);
          }
        });
      }
      return () => {};
    },
    [],
  );

  return { connected, send, subscribe };
}
