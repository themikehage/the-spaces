// SPDX-License-Identifier: MIT
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import type { AgentMessage } from "@spaces/core";
import { useEffect, useRef } from "react";
import { RichMarkdown } from "./RichMarkdown";
import { ToolCallCard } from "./ToolCallCard";

interface Props {
  messages: AgentMessage[];
  streaming?: boolean;
  sessionId?: string | null;
  activeTeamId?: string | null;
  onOpenSubagentConsole?: (toolCallId: string, targetType?: string, targetId?: string) => void;
}

export function MessageList({ messages, streaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  if (!messages || messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-surface-400 text-sm">
        No messages in this session yet. Start conversation below.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {messages.map((msg, index) => {
        const isUser = msg.role === "user";
        const isAssistant = msg.role === "assistant";

        return (
          <div
            key={msg.id || index}
            className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
          >
            {isAssistant && <AgentAvatar name="Assistant" size="sm" />}
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                isUser
                  ? "bg-accent-600 text-white rounded-br-none"
                  : "bg-surface-0 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 rounded-bl-none"
              }`}
            >
              {typeof msg.content === "string" ? (
                isUser ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <RichMarkdown content={msg.content} />
                )
              ) : Array.isArray(msg.content) ? (
                <div className="space-y-3">
                  {msg.content.map((block: any, bIdx: number) => {
                    if (block.type === "text" && block.text) {
                      return isUser ? (
                        <div key={bIdx} className="whitespace-pre-wrap">
                          {block.text}
                        </div>
                      ) : (
                        <RichMarkdown key={bIdx} content={block.text} />
                      );
                    }
                    if (block.type === "tool_call" || block.type === "toolCall" || block.name) {
                      return (
                        <ToolCallCard
                          key={bIdx}
                          toolName={block.name || block.toolName || "tool"}
                          args={block.arguments || block.args}
                          result={block.result}
                          isError={block.isError}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
