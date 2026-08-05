import { useState, useRef, type KeyboardEvent, type FormEvent } from "react";
import { Send, Square, Cpu } from "lucide-react";
import { Button } from "../ui/Button.tsx";
import type { ChatStatus } from "../../hooks/useChat.ts";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAbort?: () => void;
  status: ChatStatus;
  disabled?: boolean;
  activeModelName?: string;
}

export function ChatInput({ onSend, onAbort, status, disabled, activeModelName }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = status === "streaming";

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (isStreaming) {
      onAbort?.();
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  return (
    <div className="p-4 border-t border-border bg-surface/40">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-4xl mx-auto">
        <div className="flex flex-col bg-surface border border-border focus-within:border-primary/80 focus-within:ring-2 focus-within:ring-primary/20 rounded-xl p-3 shadow-sm transition-all duration-150">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={
              disabled
                ? "Connecting to server..."
                : "Ask Auto-Browser to execute tasks, scrape sites, run commands..."
            }
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[36px] max-h-[180px] leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
              {activeModelName && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-hover border border-border/60">
                  <Cpu className="h-3 w-3 text-primary" />
                  <span>{activeModelName}</span>
                </div>
              )}
              <span className="hidden sm:inline text-muted-foreground/70">
                Shift + Enter for newline
              </span>
            </div>

            <Button
              type="submit"
              size="sm"
              variant={isStreaming ? "destructive" : "primary"}
              disabled={disabled || (!isStreaming && !text.trim())}
              className="rounded-lg h-8 px-3 gap-1.5"
            >
              {isStreaming ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
