import React, { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
}) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isStreaming || disabled) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="relative flex items-end rounded-lg border border-zinc-700 bg-zinc-900 p-2 focus-within:border-blue-500">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isStreaming ? "Agent is thinking..." : "Type your message... (Enter to send)"}
        disabled={disabled || isStreaming}
        rows={1}
        className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-1 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50"
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          className="ml-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
        >
          Stop
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || disabled}
          className="ml-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      )}
    </div>
  );
};
