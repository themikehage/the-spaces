import { useEffect, useRef } from "react";
import type { ChatMessage } from "../hooks/useChat.ts";
import { MessageBubble } from "./MessageBubble.tsx";

interface Props {
  messages: ChatMessage[];
  isThinking?: boolean;
}

export function MessageList({ messages, isThinking }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages.at(-1)?.streaming, isThinking]);

  return (
    <div className="message-list">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isThinking && (
        <div
          className="message-bubble assistant thinking"
          style={{ opacity: 0.8, fontStyle: "italic", padding: "0.75rem 1rem", color: "#9ca3af" }}
        >
          ⚡ Agent is thinking...
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
