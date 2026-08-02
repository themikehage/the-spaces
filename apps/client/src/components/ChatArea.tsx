import React from "react";
import { useChat } from "@/hooks/useChat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface ChatAreaProps {
  sessionId: string | null;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ sessionId }) => {
  const { messages, streaming, error, send, abort, clearError } = useChat(sessionId);

  if (!sessionId) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
        Select or create a session to start chatting.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-zinc-950">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 text-xs text-zinc-400">
        <span className="font-mono">Session: {sessionId}</span>
        {streaming && <span className="text-amber-400 font-semibold animate-pulse">● Active</span>}
      </div>

      {/* Error notification banner */}
      {error && (
        <div className="flex items-center justify-between bg-red-900/50 border-b border-red-700 px-4 py-2 text-xs text-red-200">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="ml-2 font-bold hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} streaming={streaming} />

      {/* Input */}
      <div className="border-t border-zinc-800 p-3">
        <ChatInput onSend={send} onStop={abort} isStreaming={streaming} />
      </div>
    </div>
  );
};
