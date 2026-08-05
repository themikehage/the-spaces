import type { ChatMessage } from "../hooks/useChat.ts";
import { Markdown } from "./Markdown.tsx";

interface Props {
  message: ChatMessage;
}

function extractText(message: ChatMessage): string {
  return message.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");
}

interface ToolCallInfo {
  id?: string | undefined;
  name?: string | undefined;
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

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isToolResult = message.role === "toolResult";
  const text = extractText(message);
  const toolCalls = !isUser && !isToolResult ? extractToolCalls(message) : [];

  if (isToolResult) {
    return (
      <div className="message-wrap assistant">
        <div className="message-avatar assistant-avatar">⚙</div>
        <div className="tool-call-card" style={{ maxWidth: 680 }}>
          <div className="tool-call-header">
            <span>🔧</span>
            <span className="tool-call-name">{message.toolName ?? "tool"}</span>
            {message.isError && <span style={{ color: "var(--error)" }}>error</span>}
          </div>
          <div className="tool-call-body">{text}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`message-wrap ${isUser ? "user" : "assistant"}`}>
      <div className={`message-avatar ${isUser ? "user-avatar" : "assistant-avatar"}`}>
        {isUser ? "U" : "AI"}
      </div>
      <div className={`message-bubble ${message.streaming ? "streaming" : ""}`}>
        {toolCalls.map((tc, i) => (
          <div key={i} className="tool-call-card" style={{ marginBottom: 8 }}>
            <div className="tool-call-header">
              <span>⚡</span>
              <span className="tool-call-name">{tc.name ?? "unknown"}</span>
            </div>
            <div className="tool-call-body">{JSON.stringify(tc.arguments, null, 2)}</div>
          </div>
        ))}
        {text && (isUser ? <span>{text}</span> : <Markdown content={text} />)}
      </div>
    </div>
  );
}
