// SPDX-License-Identifier: MIT
import { apiFetch } from "@/api/client";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { AgentEvent, AgentMessage, MessageRecord } from "@spaces/core";
import { useCallback, useEffect, useState } from "react";

export interface UseChatResult {
  messages: AgentMessage[];
  streaming: boolean;
  error: string | null;
  send: (text: string) => void;
  abort: () => void;
  clearError: () => void;
}

export function useChat(sessionId: string | null): UseChatResult {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { send: wsSend, subscribe } = useWebSocket(sessionId);

  // Load history when session changes
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setStreaming(false);
      setError(null);
      return;
    }

    let isMounted = true;
    apiFetch<MessageRecord[]>(`/sessions/${sessionId}/messages`)
      .then((records) => {
        if (!isMounted) return;
        const history: AgentMessage[] = (records || []).map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          createdAt: r.createdAt || new Date().toISOString(),
        }));
        setMessages(history);
      })
      .catch(() => {
        // Fallback if /messages endpoint isn't mounted yet
        if (isMounted) setMessages([]);
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // Handle engine WS events
  useEffect(() => {
    if (!sessionId) return;

    const unsub = subscribe((event: AgentEvent | { type: string }) => {
      switch (event.type) {
        case "agent_start":
          setStreaming(true);
          setError(null);
          break;

        case "message_start": {
          const msg = (event as Extract<AgentEvent, { type: "message_start" }>).message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          break;
        }

        case "message_update": {
          const { message, delta } = event as Extract<AgentEvent, { type: "message_update" }>;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== message.id) return m;
              if (typeof m.content === "string" && delta.text) {
                return { ...m, content: m.content + delta.text };
              }
              return { ...m, content: message.content };
            }),
          );
          break;
        }

        case "message_end": {
          const msg = (event as Extract<AgentEvent, { type: "message_end" }>).message;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
          break;
        }

        case "agent_end": {
          const endEvt = event as Extract<AgentEvent, { type: "agent_end" }>;
          if (endEvt.messages && endEvt.messages.length > 0) {
            setMessages(endEvt.messages);
          }
          setStreaming(false);
          break;
        }

        case "agent_error": {
          const errEvt = event as Extract<AgentEvent, { type: "agent_error" }>;
          setError(errEvt.error || "Agent execution failed");
          setStreaming(false);
          break;
        }
      }
    });

    return unsub;
  }, [sessionId, subscribe]);

  const send = useCallback(
    (text: string) => {
      if (!sessionId || !text.trim() || streaming) return;

      const userMsg: AgentMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setStreaming(true);
      setError(null);

      wsSend({
        type: "prompt",
        sessionId,
        message: text,
      });
    },
    [sessionId, streaming, wsSend],
  );

  const abort = useCallback(() => {
    if (!sessionId) return;
    wsSend({
      type: "abort",
      sessionId,
    });
    setStreaming(false);
  }, [sessionId, wsSend]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    streaming,
    error,
    send,
    abort,
    clearError,
  };
}
