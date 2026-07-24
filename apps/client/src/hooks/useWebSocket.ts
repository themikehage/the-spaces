// SPDX-License-Identifier: MIT
import { wsClient } from "@/lib/ws-client";
import { useCallback, useEffect, useState } from "react";
import { isSessionScopedType, type WsClientMessage, type WsServerMessageType } from "shared";
import { useConnectionAwareEffect } from "./useConnectionAware";

type EventHandler = (data: unknown) => void;

interface WebSocketState {
  connected: boolean;
  send: (data: Record<string, unknown> | WsClientMessage) => void;
  subscribe: (type: WsServerMessageType | string, handler: EventHandler) => () => void;
}

export function useWebSocket(sessionId: string | null): WebSocketState {
  const [connected, setConnected] = useState<boolean>(wsClient.getState() === "connected");

  useEffect(() => {
    const unsub = wsClient.onStateChange((state) => {
      setConnected(state === "connected");
    });
    return unsub;
  }, []);

  useConnectionAwareEffect(() => {
    if (!sessionId) return;
    wsClient.send({ type: "session_subscribe", sessionId });
    return () => {
      wsClient.send({ type: "session_unsubscribe", sessionId });
    };
  }, [sessionId]);

  const send = useCallback(
    (data: Record<string, unknown> | WsClientMessage) => {
      const payload = { ...(sessionId ? { sessionId } : {}), ...data } as WsClientMessage;
      wsClient.send(payload);
    },
    [sessionId],
  );

  const subscribe = useCallback(
    (type: WsServerMessageType | string, handler: EventHandler) => {
      return wsClient.subscribe(type as WsServerMessageType, (data: any) => {
        if (isSessionScopedType(type)) {
          const sid = data?.sessionId;
          if (sid && sessionId && sid !== sessionId) return;
        }
        handler(data);
      });
    },
    [sessionId],
  );

  return { connected, send, subscribe };
}
