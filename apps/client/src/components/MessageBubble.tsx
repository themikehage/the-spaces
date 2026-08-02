import React from "react";
import type { AgentMessage, ContentBlock } from "@spaces/core";
import { Markdown } from "./Markdown";

interface MessageBubbleProps {
  message: AgentMessage;
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming = false }) => {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const renderContent = (content: string | ContentBlock[]) => {
    if (typeof content === "string") {
      return <Markdown content={content} />;
    }
    return content.map((block, idx) => {
      if (block.type === "text" && block.text) {
        return <Markdown key={idx} content={block.text} />;
      }
      if (block.type === "tool_use" && block.toolUse) {
        return (
          <div key={idx} className="my-1 rounded bg-zinc-800 p-2 font-mono text-xs text-amber-400">
            🔧 <span className="font-semibold">{block.toolUse.name}</span>
            <pre className="mt-1 overflow-x-auto text-[10px] text-zinc-400">
              {JSON.stringify(block.toolUse.arguments, null, 2)}
            </pre>
          </div>
        );
      }
      if (block.type === "tool_result" && block.toolResult) {
        return (
          <div key={idx} className="my-1 rounded bg-zinc-900 p-2 font-mono text-xs text-zinc-300">
            {block.toolResult.isError ? "❌ Error:" : "✅ Result:"}
            <pre className="mt-1 max-h-40 overflow-y-auto text-[10px] text-zinc-400">
              {block.toolResult.output}
            </pre>
          </div>
        );
      }
      return null;
    });
  };

  if (isSystem) {
    return (
      <div className="my-2 text-center text-xs italic text-zinc-500">
        {typeof message.content === "string" ? message.content : "System message"}
      </div>
    );
  }

  return (
    <div className={`flex w-full my-2 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-sm ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-zinc-800 text-zinc-100 border border-zinc-700/50 rounded-bl-none"
        }`}
      >
        <div className="mb-1 flex items-center justify-between text-[10px] opacity-70">
          <span className="font-semibold uppercase tracking-wider">{message.role}</span>
          {isStreaming && <span className="animate-pulse text-blue-400">typing...</span>}
        </div>
        {renderContent(message.content)}
      </div>
    </div>
  );
};
