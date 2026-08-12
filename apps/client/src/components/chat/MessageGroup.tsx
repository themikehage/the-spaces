import { AgentAvatar } from "@/components/shared/AgentAvatar";
import { formatTimestamp, type Message } from "@/lib/message-grouping";
import { AlertCircle, Check, Copy } from "lucide-react";
import { useState } from "react";
import { AssistantTextBlock, ThinkingBlock } from "./MessageBlocks";
import { BranchNav } from "./SystemMessage";
import { ToolCallRow, type ToolResultData } from "./tools/ToolCallRow";

function AssistantMessageFooter({ msg }: { msg: Message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const rawText =
      typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
          ? (msg.content as Array<{ text?: string }>).map((b) => b.text ?? "").join(" ")
          : "";
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-2 text-xs text-muted-foreground font-mono select-none">
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1 text-[11px] hover:text-foreground transition-colors cursor-pointer"
        title={copied ? "Copiado!" : "Copiar mensaje"}
      >
        {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
        <span>{copied ? "Copiado" : "Copiar"}</span>
      </button>
      {msg.provider && (
        <span>
          • provider: <span className="text-muted-foreground">{msg.provider}</span>
        </span>
      )}
      {msg.model && (
        <span>
          • model: <span className="text-muted-foreground">{msg.model}</span>
        </span>
      )}
      {msg.usage && (
        <>
          <span>
            • tokens:{" "}
            <span className="text-muted-foreground">
              {msg.usage.totalTokens ?? msg.usage.input + msg.usage.output}
            </span>
          </span>
          {typeof msg.usage.cost?.total === "number" && (
            <span>
              • cost:{" "}
              <span className="text-muted-foreground">
                ${msg.usage.cost.total.toFixed(6)}
              </span>
            </span>
          )}
        </>
      )}
      {msg.timestamp && (
        <span>
          •{" "}
          <span className="text-muted-foreground">
            {formatTimestamp(msg.timestamp)}
          </span>
        </span>
      )}
    </div>
  );
}

interface MessageGroupProps {
  messages: Message[];
  sessionId: string | null;
  onNavigate?: (id: string) => void;
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeAgentName?: string | null;
  activeAgentAvatarUrl?: string | null;
  activeChannelId?: string | null;
  activeTeamId?: string | null;
  serialTools?: string[];
  onOpenSubagentConsole?: (toolCallId: string, targetType?: string, targetId?: string) => void;
}

export function MessageGroup({
  messages,
  sessionId,
  onNavigate,
  activeProjectName,
  activeAgentId,
  activeAgentName,
  activeAgentAvatarUrl,
  activeChannelId,
  activeTeamId,
  serialTools = [],
  onOpenSubagentConsole,
}: MessageGroupProps) {
  const toolResultMap = new Map<string, Message>();
  for (const m of messages) {
    if ((m.role === "toolResult" || m.role === "tool_result") && m.toolCallId) {
      toolResultMap.set(m.toolCallId, m);
    }
  }

  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const lastAssistant = assistantMessages[assistantMessages.length - 1];

  const pendingInteractiveIds: string[] = [];
  for (const msg of assistantMessages) {
    const blocks = Array.isArray(msg.content) ? msg.content : [];
    for (const block of blocks) {
      if (block.type === "toolCall" && block.name && block.id) {
        const isInteractive = serialTools.includes(block.name);
        const hasResult = toolResultMap.has(block.id);
        if (isInteractive && !hasResult) {
          pendingInteractiveIds.push(block.id);
        }
      }
    }
  }

  const firstAssistant = assistantMessages[0];
  const displayName =
    firstAssistant?.agentName || firstAssistant?.model || activeAgentName || "Agent";
  const displayAvatar = firstAssistant?.agentAvatarUrl || activeAgentAvatarUrl;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <AgentAvatar name={displayName} avatarUrl={displayAvatar} size="sm" />
        <span className="text-xs font-semibold text-foreground truncate">{displayName}</span>
        {firstAssistant?.timestamp && (
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            {formatTimestamp(firstAssistant.timestamp)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        {assistantMessages.map((msg, msgIdx) => {
          const blocks = Array.isArray(msg.content) ? msg.content : [];
          const isLast = msgIdx === assistantMessages.length - 1;
          const isStreaming = !!msg.isStreaming;

          if (msg.stopReason === "error") {
            const errorText =
              msg.errorMessage ||
              "The API returned an error. Please check your provider configuration.";
            return (
              <div
                key={msgIdx}
                className="px-4 py-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-sans mb-3 flex flex-col gap-1.5 shadow-sm"
              >
                <div className="flex items-center gap-2 text-error font-semibold">
                  <AlertCircle size={14} className="shrink-0" />
                  <span className="uppercase tracking-wider">Provider API Error</span>
                </div>
                <p className="leading-relaxed opacity-90">{errorText}</p>
              </div>
            );
          }

          return (
            <div key={msgIdx}>
              {blocks.map((block, i) => {
                if (block.type === "thinking" && block.thinking) {
                  return (
                    <ThinkingBlock key={i} thinking={block.thinking} isStreaming={isStreaming} />
                  );
                }
                if (block.type === "text" && block.text) {
                  return (
                    <div
                      key={i}
                      className="text-foreground text-base md:text-sm leading-relaxed break-word"
                    >
                      <AssistantTextBlock
                        text={block.text}
                        sessionId={sessionId}
                        activeProjectName={activeProjectName}
                        activeAgentId={activeAgentId}
                        activeChannelId={activeChannelId}
                      />
                    </div>
                  );
                }
                if (block.type === "toolCall" && block.name && block.id) {
                  const matchedResult = toolResultMap.get(block.id);
                  const resultData: ToolResultData | null = matchedResult
                    ? {
                        toolName: matchedResult.toolName ?? block.name,
                        content: Array.isArray(matchedResult.content)
                          ? (matchedResult.content as Array<{
                              type: string;
                              text?: string;
                              data?: string;
                              mimeType?: string;
                            }>)
                          : [{ type: "text", text: String(matchedResult.content) }],
                        isError: matchedResult.isError ?? false,
                        details: matchedResult.details,
                      }
                    : null;

                  const isPending = pendingInteractiveIds.includes(block.id);
                  const isFirstPending = pendingInteractiveIds[0] === block.id;
                  const disabled = isPending && !isFirstPending;

                  return (
                    <ToolCallRow
                      key={i}
                      toolName={block.name}
                      args={block.arguments ?? {}}
                      result={resultData}
                      sessionId={sessionId}
                      toolCallId={block.id}
                      activeProjectName={activeProjectName}
                      activeAgentId={activeAgentId}
                      activeChannelId={activeChannelId}
                      activeTeamId={activeTeamId}
                      disabled={disabled}
                      serialTools={serialTools}
                      onOpenSubagentConsole={onOpenSubagentConsole}
                    />
                  );
                }
                return null;
              })}

              {isLast && isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse rounded-sm" />
              )}

              {!isStreaming && <AssistantMessageFooter msg={msg} />}
            </div>
          );
        })}

        {lastAssistant && <BranchNav msg={lastAssistant} onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
