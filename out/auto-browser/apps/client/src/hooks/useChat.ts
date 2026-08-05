import { useState, useCallback, useEffect } from "react";
import type { AgentEvent, Message } from "../api/ws.ts";
import { api } from "../api/client.ts";

export type ChatMessage = Message & {
  id: string;
  streaming?: boolean;
};

export type ChatStatus = "idle" | "streaming" | "error";

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [partialResults, setPartialResults] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setPartialResults({});
      return;
    }

    let isMounted = true;
    void api.sessions
      .getMessages(sessionId)
      .then((history) => {
        if (!isMounted) return;
        const formatted: ChatMessage[] = (history || []).map((msg) => ({
          ...msg,
          id: crypto.randomUUID(),
        }));
        setMessages(formatted);
      })
      .catch((err) => {
        console.warn("[useChat] Could not load session message history:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const addOptimisticUserMessage = useCallback((text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: [{ type: "text", text }],
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStatus("streaming");
  }, []);

  const handleEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case "agent_start":
        setStatus("streaming");
        setError(null);
        break;

      case "agent_end":
        setStatus("idle");
        break;

      case "agent_error":
      case "error":
        setStatus("error");
        setError(event.error);
        break;

      case "tool_execution_update":
        if (event.toolCallId) {
          setPartialResults((prev) => ({
            ...prev,
            [event.toolCallId]: event.partialResult,
          }));
        }
        break;

      case "message_start": {
        const msg = event.message;
        setMessages((prev) => {
          // Deduplicate if user message was already added optimistically
          if (msg.role === "user") {
            const last = prev[prev.length - 1];
            if (last && last.role === "user" && last.content[0]?.text === msg.content[0]?.text) {
              return prev;
            }
          }
          return [
            ...prev,
            {
              ...msg,
              id: crypto.randomUUID(),
              streaming: msg.role === "assistant",
            },
          ];
        });
        break;
      }

      case "message_update": {
        const updated = event.message;
        setMessages((prev) =>
          prev.map((m) =>
            m.streaming && m.role === "assistant" ? { ...m, ...updated, streaming: true } : m,
          ),
        );
        break;
      }

      case "message_end": {
        const final = event.message;
        setMessages((prev) =>
          prev.map((m) =>
            m.streaming && m.role === "assistant" ? { ...m, ...final, streaming: false } : m,
          ),
        );
        break;
      }
    }
  }, []);

  const abort = useCallback(() => {
    setStatus("idle");
    setMessages((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)));
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setStatus("idle");
    setError(null);
    setPartialResults({});
  }, []);

  return {
    messages,
    status,
    error,
    partialResults,
    handleEvent,
    addOptimisticUserMessage,
    abort,
    reset,
  };
}
