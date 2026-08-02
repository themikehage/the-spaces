import React, { useEffect, useRef } from "react";
import type { AgentMessage } from "@spaces/core";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: AgentMessage[];
  streaming?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, streaming = false }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        No messages yet. Send a prompt to start the conversation!
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((msg, index) => {
        const isLast = index === messages.length - 1;
        return (
          <MessageBubble
            key={msg.id || index}
            message={msg}
            isStreaming={streaming && isLast && msg.role === "assistant"}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
