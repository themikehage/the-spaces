import { useState } from "react";
import { ArrowDown, Bot, User, AlertCircle, Zap, ChevronDown } from "lucide-react";
import type { ChatMessage } from "../../hooks/useChat.ts";
import { useChatScroll } from "./hooks/useChatScroll.ts";
import { Skeleton } from "../ui/Skeleton.tsx";
import { RichMarkdown } from "./RichMarkdown.tsx";
import { ToolCallRow, type ToolResultData } from "./tools/ToolCallRow.tsx";

interface MessageListProps {
  messages: ChatMessage[];
  isThinking?: boolean;
  sessionId?: string | null;
  partialResults?: Record<string, unknown>;
  onApproval?: (toolCallId: string, action: "confirm" | "cancel") => void;
  onAnswer?: (
    toolCallId: string,
    answer: { selectedOptions?: string[]; customAnswer?: string },
  ) => void;
}

type RenderGroup = { type: "user"; msg: ChatMessage } | { type: "agent"; messages: ChatMessage[] };

function buildGroups(messages: ChatMessage[]): RenderGroup[] {
  const groups: RenderGroup[] = [];
  let agentBuf: ChatMessage[] = [];

  const flush = () => {
    if (agentBuf.length > 0) {
      groups.push({ type: "agent", messages: agentBuf });
      agentBuf = [];
    }
  };

  for (const msg of messages) {
    if (msg.role === "user") {
      flush();
      groups.push({ type: "user", msg });
    } else {
      agentBuf.push(msg);
    }
  }
  flush();
  return groups;
}

function extractText(message: ChatMessage): string {
  if (!Array.isArray(message.content)) return "";
  return message.content
    .filter(
      (b): b is { type: "text"; text: string } => b.type === "text" && typeof b.text === "string",
    )
    .map((b) => b.text)
    .join("");
}

function ThinkingBlock({ thinking, isStreaming }: { thinking: string; isStreaming?: boolean }) {
  const [open, setOpen] = useState(false);
  const previewText = thinking.trim().replace(/\n/g, " ");

  return (
    <div className="my-1.5 w-full">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1.5 w-full text-left px-3 py-1.5 rounded cursor-pointer select-none transition-colors hover:bg-primary/10 text-[11px] font-mono text-muted-foreground/80 border-l-2 min-w-0 bg-surface/40 ${
            isStreaming ? "border-primary animate-pulse" : "border-primary/40"
          }`}
        >
          <Zap
            size={11}
            className={`flex-shrink-0 ${isStreaming ? "text-primary" : "text-amber-400"}`}
          />
          <span className="truncate flex-1">{previewText}</span>
          <ChevronDown size={11} className="flex-shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <div className="rounded-lg border border-border/50 bg-surface/50 p-3 my-1 w-full space-y-1.5">
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-between w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none pb-1.5 border-b border-border/30 font-semibold"
          >
            <div className="flex items-center gap-1.5">
              <Zap size={11} className="text-amber-400" />
              <span>Pensamiento del Agente</span>
            </div>
            <ChevronDown size={11} className="rotate-180 text-muted-foreground" />
          </button>
          <div className="pt-1 text-[11px] text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {thinking}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentTurn({
  messages,
  sessionId,
  partialResults,
  onApproval,
  onAnswer,
}: {
  messages: ChatMessage[];
  sessionId?: string | null;
  partialResults?: Record<string, unknown>;
  onApproval?: (toolCallId: string, action: "confirm" | "cancel") => void;
  onAnswer?: (
    toolCallId: string,
    answer: { selectedOptions?: string[]; customAnswer?: string },
  ) => void;
}) {
  const toolResults = messages.filter(
    (m) => m.role === "toolResult" || (m as any).role === "tool_result",
  );

  const assistantMessages = messages.filter((m) => m.role === "assistant");
  if (assistantMessages.length === 0) return null;

  const firstAssistant = assistantMessages[0];
  const displayName = firstAssistant?.agentName || "Auto-Browser";
  const timeStr = firstAssistant?.timestamp
    ? new Date(firstAssistant.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex gap-3 px-4 py-2.5 w-full self-start">
      <div className="h-8 w-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0 mt-0.5 text-xs font-medium shadow-xs">
        <Bot className="h-4 w-4 text-primary" />
      </div>

      <div className="flex flex-col min-w-0 flex-1 w-full gap-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/80">{displayName}</span>
          {timeStr && <span>{timeStr}</span>}
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border text-foreground rounded-tl-xs shadow-xs text-sm leading-relaxed space-y-2 w-full">
          {assistantMessages.map((msg, msgIdx) => {
            const blocks = Array.isArray(msg.content) ? msg.content : [];
            const text = extractText(msg);

            if (msg.stopReason === "error") {
              return (
                <div
                  key={msgIdx}
                  className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-sans flex items-center gap-2 w-full"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{msg.errorMessage || "Ocurrió un error al procesar la solicitud."}</span>
                </div>
              );
            }

            return (
              <div key={msgIdx} className="space-y-2 w-full">
                {blocks.map((block: any, i: number) => {
                  if (
                    block.type === "thinking" ||
                    block.type === "reasoning" ||
                    (block.thinking && typeof block.thinking === "string")
                  ) {
                    const thinkingText = block.thinking || block.text || "";
                    if (thinkingText) {
                      return (
                        <ThinkingBlock
                          key={i}
                          thinking={thinkingText}
                          isStreaming={msg.streaming}
                        />
                      );
                    }
                  }

                  if (block.type === "toolCall" && block.name) {
                    const toolCallId = block.id || `tool-${i}`;
                    const matchedResult =
                      toolResults.find(
                        (m) =>
                          (block.id &&
                            m.toolCallId &&
                            (m.toolCallId === block.id ||
                              m.toolCallId.includes(block.id) ||
                              block.id.includes(m.toolCallId))) ||
                          (m.toolName &&
                            (m.toolName === block.name || m.toolName.includes(block.name))),
                      ) ||
                      toolResults[i] ||
                      toolResults[0];

                    const resultData: ToolResultData | null = matchedResult
                      ? {
                          toolName: matchedResult.toolName || block.name,
                          content: Array.isArray(matchedResult.content)
                            ? (matchedResult.content as any[])
                            : [{ type: "text", text: String(matchedResult.content || "") }],
                          isError: matchedResult.isError ?? false,
                          details: (matchedResult as any).details,
                        }
                      : null;

                    const status = matchedResult
                      ? matchedResult.isError
                        ? "error"
                        : "done"
                      : "running";

                    return (
                      <ToolCallRow
                        key={i}
                        toolCallId={toolCallId}
                        toolName={block.name}
                        args={block.arguments}
                        resultData={resultData}
                        partialResult={partialResults?.[toolCallId]}
                        status={status}
                        sessionId={sessionId}
                        onApproval={onApproval}
                        onAnswer={onAnswer}
                      />
                    );
                  }

                  return null;
                })}

                {text && <RichMarkdown content={text} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  isThinking,
  sessionId,
  partialResults,
  onApproval,
  onAnswer,
}: MessageListProps) {
  const { containerRef, isAtBottom, scrollToBottom } = useChatScroll<HTMLDivElement>([
    messages,
    isThinking,
  ]);

  const groups = buildGroups(messages);

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden w-full">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth w-full"
      >
        {groups.map((group, idx) => {
          if (group.type === "user") {
            const text = extractText(group.msg);
            const timeStr = group.msg.timestamp
              ? new Date(group.msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null;

            return (
              <div
                key={idx}
                className="flex gap-3 px-4 py-2.5 max-w-3xl flex-row-reverse self-end ml-auto"
              >
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5 text-xs font-medium shadow-xs">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0 max-w-2xl gap-1">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground justify-end">
                    <span className="font-semibold text-foreground/80">You</span>
                    {timeStr && <span>{timeStr}</span>}
                  </div>
                  <div className="p-3.5 rounded-2xl bg-primary text-primary-foreground rounded-tr-xs shadow-xs text-sm leading-relaxed whitespace-pre-wrap">
                    {text}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <AgentTurn
              key={idx}
              messages={group.messages}
              sessionId={sessionId}
              onApproval={onApproval}
              onAnswer={onAnswer}
            />
          );
        })}

        {isThinking && (
          <div className="flex gap-3 px-4 py-2.5 max-w-2xl self-start">
            <div className="h-8 w-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl rounded-tl-xs bg-surface border border-border flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Thinking</span>
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}
      </div>

      {!isAtBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:brightness-110 transition-all animate-card-enter cursor-pointer"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          <span>Scroll to bottom</span>
        </button>
      )}
    </div>
  );
}
