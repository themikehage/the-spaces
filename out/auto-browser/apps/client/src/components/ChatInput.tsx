import { useRef, useCallback, type KeyboardEvent } from "react";
import type { ChatStatus } from "../hooks/useChat.ts";

interface Props {
  onSend: (text: string) => void;
  onAbort: () => void;
  status: ChatStatus;
  disabled?: boolean;
}

export function ChatInput({ onSend, onAbort, status, disabled }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = status === "streaming";

  const handleSend = useCallback(() => {
    const text = textareaRef.current?.value.trim();
    if (!text || isStreaming) return;

    onSend(text);

    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
  }, [onSend, isStreaming]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);

  return (
    <div className="chat-input-area">
      <div className="chat-input-wrap">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder={
            isStreaming
              ? "Waiting for response..."
              : "Message auto-browser... (Enter to send, Shift+Enter for newline)"
          }
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled || isStreaming}
          rows={1}
          aria-label="Chat message input"
          id="chat-input"
        />
        {isStreaming ? (
          <button
            className="btn-send btn-stop"
            onClick={onAbort}
            title="Stop generation"
            aria-label="Stop generation"
            id="btn-abort"
          >
            ⏹
          </button>
        ) : (
          <button
            className="btn-send"
            onClick={handleSend}
            disabled={disabled}
            title="Send message"
            aria-label="Send message"
            id="btn-send"
          >
            ↑
          </button>
        )}
      </div>
    </div>
  );
}
