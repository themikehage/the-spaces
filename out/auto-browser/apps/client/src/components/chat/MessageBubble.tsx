import { Bot, User, Wrench } from "lucide-react";
import type { ChatMessage } from "../../hooks/useChat.ts";
import { RichMarkdown } from "./RichMarkdown.tsx";
import { ToolCallRow } from "./tools/ToolCallRow.tsx";

interface MessageBubbleProps {
  message: ChatMessage;
}

function extractText(message: ChatMessage): string {
  return message.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");
}

interface ToolCallInfo {
  id?: string;
  name?: string;
  arguments?: unknown;
}

function extractToolCalls(message: ChatMessage): ToolCallInfo[] {
  return (message.content as Array<{ type: string; [k: string]: unknown }>)
    .filter((b) => b.type === "toolCall")
    .map((b) => ({
      id: typeof b["id"] === "string" ? b["id"] : undefined,
      name: typeof b["name"] === "string" ? b["name"] : undefined,
      arguments: b["arguments"],
    }));
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isToolResult = message.role === "toolResult";
  const text = extractText(message);
  const toolCalls = !isUser && !isToolResult ? extractToolCalls(message) : [];

  const timeStr = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  if (isToolResult) {
    return (
      <div className="flex gap-3 px-4 py-1.5 max-w-3xl">
        <div className="h-7 w-7 rounded-full bg-surface border border-border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
          <Wrench className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <ToolCallRow
            toolName={message.toolName || "tool"}
            result={text}
            isError={message.isError}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 px-4 py-2.5 max-w-4xl ${isUser ? "flex-row-reverse self-end ml-auto" : "self-start"}`}
    >
      {/* Avatar */}
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-medium shadow-xs ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-surface border border-border text-foreground"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
      </div>

      {/* Content Box */}
      <div className="flex flex-col min-w-0 max-w-2xl gap-1">
        <div
          className={`flex items-center gap-2 text-[11px] text-muted-foreground ${isUser ? "justify-end" : ""}`}
        >
          <span className="font-semibold text-foreground/80">
            {isUser ? "You" : "Auto-Browser"}
          </span>
          {timeStr && <span>{timeStr}</span>}
        </div>

        <div
          className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-xs shadow-xs"
              : "bg-surface border border-border text-foreground rounded-tl-xs shadow-xs"
          } ${message.streaming ? "streaming-cursor" : ""}`}
        >
          {toolCalls.map((tc, idx) => (
            <ToolCallRow
              key={idx}
              toolName={tc.name || "unknown"}
              args={tc.arguments}
              status="running"
            />
          ))}

          {text &&
            (isUser ? (
              <span className="whitespace-pre-wrap">{text}</span>
            ) : (
              <RichMarkdown content={text} />
            ))}
        </div>
      </div>
    </div>
  );
}
