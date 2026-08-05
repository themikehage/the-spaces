import { useChat } from "../../hooks/useChat.ts";
import { useWebSocket } from "../../hooks/useWebSocket.ts";
import { MessageList } from "./MessageList.tsx";
import { ChatInput } from "./ChatInput.tsx";
import { AlertCircle, Wifi } from "lucide-react";

interface ChatAreaProps {
  sessionId: string;
  activeModelName?: string;
}

export function ChatArea({ sessionId, activeModelName }: ChatAreaProps) {
  const { messages, status, error, partialResults, handleEvent, addOptimisticUserMessage, abort } =
    useChat(sessionId);
  const { send, connectionState } = useWebSocket(sessionId, handleEvent);

  const handleSend = (text: string) => {
    addOptimisticUserMessage(text);
    send({ type: "prompt", message: text });
  };

  const handleAbort = () => {
    abort();
    send({ type: "abort" });
  };

  const isThinking =
    status === "streaming" && !messages.some((m) => m.role === "assistant" && m.streaming);

  const connectionBadge = {
    open: { color: "bg-success", text: "Connected" },
    connecting: { color: "bg-warning animate-pulse", text: "Connecting..." },
    closed: { color: "bg-muted-foreground", text: "Disconnected" },
    error: { color: "bg-error", text: "Connection Error" },
  }[connectionState];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Top Status Bar */}
      <div className="px-4 py-2 border-b border-border bg-surface/30 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-[11px]">Session ID: {sessionId.slice(0, 8)}...</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connectionBadge.color}`} />
          <span className="font-medium text-foreground/80">{connectionBadge.text}</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-error/15 border border-error/40 text-error flex items-start gap-2.5 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-mono">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Message List */}
      <MessageList messages={messages} isThinking={isThinking} partialResults={partialResults} />

      {/* Chat Input */}
      <ChatInput
        onSend={handleSend}
        onAbort={handleAbort}
        status={status}
        disabled={connectionState !== "open" && connectionState !== "connecting"}
        activeModelName={activeModelName}
      />
    </div>
  );
}
