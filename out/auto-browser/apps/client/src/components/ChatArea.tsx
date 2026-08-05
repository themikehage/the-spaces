import { useChat } from "../hooks/useChat.ts";
import { useWebSocket } from "../hooks/useWebSocket.ts";
import { MessageList } from "./MessageList.tsx";
import { ChatInput } from "./ChatInput.tsx";

interface Props {
  sessionId: string;
}

export function ChatArea({ sessionId }: Props) {
  const { messages, status, error, handleEvent, addOptimisticUserMessage } = useChat(sessionId);
  const { send, connectionState } = useWebSocket(sessionId, handleEvent);

  const handleSend = (text: string) => {
    addOptimisticUserMessage(text);
    send({ type: "prompt", message: text });
  };

  const handleAbort = () => {
    send({ type: "abort" });
  };

  const isThinking =
    status === "streaming" && !messages.some((m) => m.role === "assistant" && m.streaming);

  const connectionBadge = {
    open: { color: "#22c55e", text: "Connected" },
    connecting: { color: "#eab308", text: "Connecting..." },
    closed: { color: "#6b7280", text: "Disconnected" },
    error: { color: "#ef4444", text: "Connection Error" },
  }[connectionState];

  return (
    <div className="chat-area">
      <div
        className="chat-status-bar"
        style={{
          padding: "0.5rem 1rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.75rem",
          color: "#9ca3af",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: connectionBadge.color,
            display: "inline-block",
          }}
        />
        <span>WebSocket: {connectionBadge.text}</span>
      </div>

      {error && (
        <div
          className="chat-error-banner"
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderLeft: "4px solid #ef4444",
            color: "#f87171",
            margin: "0.5rem 1rem",
            borderRadius: "4px",
            fontSize: "0.875rem",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      <MessageList messages={messages} isThinking={isThinking} />
      <ChatInput
        onSend={handleSend}
        onAbort={handleAbort}
        status={status}
        disabled={connectionState !== "open" && connectionState !== "connecting"}
      />
    </div>
  );
}
