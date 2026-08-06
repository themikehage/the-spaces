// SPDX-License-Identifier: MIT
import { useWebSocket } from "@/hooks/useWebSocket";
import { fetchSessionMessages } from "@/lib/api/sessions.service";
import type { Message } from "@/lib/message-grouping";
import { Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { MessageList } from "../chat/MessageList";

interface WorkflowStepChatStreamProps {
  agentSessionId: string;
  status: string;
}

export const WorkflowStepChatStream: React.FC<WorkflowStepChatStreamProps> = ({
  agentSessionId,
  status,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { subscribe } = useWebSocket(agentSessionId);

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const raw = await fetchSessionMessages(agentSessionId);
        const list = Array.isArray(raw) ? raw : (raw as any)?.messages || [];
        setMessages(list);
      } catch {
        /* noop */
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [agentSessionId],
  );

  useEffect(() => {
    loadMessages();

    if (status !== "running") return;

    const unsubMsg = subscribe("session_message", (data: any) => {
      if (data?.message) {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === data.message.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data.message;
            return next;
          }
          return [...prev, data.message];
        });
      }
    });

    const unsubChunk = subscribe("session_message_chunk", (data: any) => {
      if (data?.chunk && data?.messageId) {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === data.messageId);
          if (idx >= 0) {
            const next = [...prev];
            const target = next[idx];
            const currentContent = typeof target.content === "string" ? target.content : "";
            next[idx] = {
              ...target,
              content: currentContent + data.chunk,
              isStreaming: true,
            };
            return next;
          }
          return [
            ...prev,
            {
              id: data.messageId,
              role: "assistant",
              content: data.chunk,
              isStreaming: true,
            },
          ];
        });
      }
    });

    const unsubEnd = subscribe("message_end", () => {
      loadMessages(true);
    });

    const unsubAgentEnd = subscribe("agent_end", () => {
      loadMessages(true);
    });

    return () => {
      unsubMsg();
      unsubChunk();
      unsubEnd();
      unsubAgentEnd();
    };
  }, [agentSessionId, status, subscribe, loadMessages]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        <span>Loading step execution stream...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/50 max-h-96 overflow-y-auto rounded-lg bg-background/40 p-3">
      <MessageList messages={messages} sessionId={agentSessionId} />
    </div>
  );
};
