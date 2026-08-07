// SPDX-License-Identifier: MIT
import { useAuth } from "@/contexts/AuthContext";
import { useLiterals } from "@/lib";
import { resolveFileUrl } from "@/lib/file-urls";
import type { Message } from "@/lib/message-grouping";
import clsx from "clsx";
import { DELEGATION_NOTIFICATION_TYPE } from "shared";
import { ImageGrid } from "./ImageGrid";
import { literals as u } from "./MessageList.literals";
import { RichMarkdown } from "./RichMarkdown";
import { getFileType, type MediaType } from "./ToolResultInspector";

export function BranchNav({
  msg,
  onNavigate,
}: {
  msg: Message;
  onNavigate?: (id: string) => void;
}) {
  const l = useLiterals(u);
  if (!msg.siblings || msg.siblings.length <= 1 || !msg.id || !onNavigate) return null;
  const idx = msg.siblings.indexOf(msg.id);
  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 mt-2 pt-1.5 border-t select-none text-xs font-mono",
        msg.role === "user"
          ? "border-border/40 text-muted-foreground"
          : "border-input/30 text-muted-foreground",
      )}
    >
      <button
        onClick={() => {
          const i = msg.siblings!.indexOf(msg.id!);
          if (i > 0) onNavigate(msg.siblings![i - 1]);
        }}
        disabled={idx === 0}
        className={clsx(
          "p-0.5 rounded transition-colors cursor-pointer",
          idx > 0
            ? msg.role === "user"
              ? "hover:bg-muted hover:text-foreground text-muted-foreground"
              : "hover:bg-card-hover hover:text-foreground text-muted-foreground/80"
            : "opacity-30 cursor-not-allowed",
        )}
        title={l.prevVersion}
      >
        ←
      </button>
      <span>
        {idx + 1} / {msg.siblings.length}
      </span>
      <button
        onClick={() => {
          const i = msg.siblings!.indexOf(msg.id!);
          if (i < msg.siblings!.length - 1) onNavigate(msg.siblings![i + 1]);
        }}
        disabled={idx === msg.siblings.length - 1}
        className={clsx(
          "p-0.5 rounded transition-colors cursor-pointer",
          idx < msg.siblings.length - 1
            ? msg.role === "user"
              ? "hover:bg-muted hover:text-foreground text-muted-foreground"
              : "hover:bg-card-hover hover:text-foreground text-muted-foreground/80"
            : "opacity-30 cursor-not-allowed",
        )}
        title={l.nextVersion}
      >
        →
      </button>
    </div>
  );
}

export function DelegationNotification({ msg }: { msg: Message }) {
  const d = msg.details;
  if (!d || d.type !== DELEGATION_NOTIFICATION_TYPE) return null;

  const borderColors: Record<string, string> = {
    success: "border-l-green-500/60",
    error: "border-l-red-500/60",
    blocked: "border-l-yellow-500/60",
    partial: "border-l-yellow-500/60",
  };
  const dotColors: Record<string, string> = {
    success: "bg-green-500",
    error: "bg-red-500",
    blocked: "bg-yellow-500",
    partial: "bg-yellow-500",
  };
  const statusLabels: Record<string, string> = {
    success: "Completed",
    error: "Error",
    blocked: "Blocked",
    partial: "Partial",
  };

  const status = (d.status as string) || "success";
  const borderColor = borderColors[status] || "border-l-accent/60";
  const dotColor = dotColors[status] || "bg-accent";
  const statusLabel = statusLabels[status] || status;
  const summary = (d as any).executiveSummary || "";
  const artifacts = (d as any).artifacts || "";
  const hasOutputText = (d as any).hasOutputText || false;
  const toolName = (d as any).toolName || "";

  const text =
    typeof msg.content === "string"
      ? msg.content
      : Array.isArray(msg.content)
        ? (msg.content as Array<{ text?: string }>).map((b) => b.text ?? "").join(" ")
        : "";

  const bodyLines = text.split("\n").filter((l) => l.trim());
  const outputText = hasOutputText ? bodyLines.slice(1).join("\n").trim() : "";

  return (
    <div className="flex justify-start my-2 w-full">
      <div
        className={`bg-surface/20 border border-border/50 border-l-2 ${borderColor} text-text-secondary text-xs rounded-lg rounded-l-sm px-4 py-3 max-w-[85%] shadow-xs flex flex-col gap-2`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
          <span className="text-[10px] font-mono uppercase font-semibold tracking-wider text-text-secondary">
            {toolName} {statusLabel}
          </span>
        </div>
        {summary && (
          <p className="text-xs text-text-primary leading-relaxed line-clamp-2">{summary}</p>
        )}
        {artifacts && artifacts !== "none" && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono uppercase text-text-secondary tracking-wider">
              Artifacts
            </span>
            <span className="text-[10px] text-text-primary font-mono px-1.5 py-0.5 rounded bg-surface border border-border/50 truncate max-w-[200px]">
              {artifacts}
            </span>
          </div>
        )}
        {outputText && (
          <details className="group">
            <summary className="text-[10px] font-mono text-accent hover:text-accent-hover cursor-pointer select-none">
              View output
            </summary>
            <div className="mt-2 p-2.5 bg-bg/50 border border-border/30 rounded text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto font-mono">
              {outputText}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

interface UserAttachment {
  path: string;
  name: string;
  type: MediaType;
}

function extractUserAttachments(text: string): UserAttachment[] {
  const attachments: UserAttachment[] = [];
  const regex = /\[Attached File:\s*([^\n\]]+)\]/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const path = match[1].trim();
    const name = path.split(/[\\/]/).pop() || "file";
    attachments.push({
      path,
      name,
      type: getFileType(path),
    });
  }
  return attachments;
}

function cleanUserMessageText(text: string): string {
  return text.replace(/\[Attached File:\s*([^\n\]]+)\]\s*\([^\n)]+\)/gi, "").trim();
}

export function UserBubble({
  msg,
  onNavigate,
  sessionId,
  activeProjectName,
  activeAgentId = null,
  activeChannelId = null,
}: {
  msg: Message;
  onNavigate?: (id: string) => void;
  sessionId: string | null;
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeChannelId?: string | null;
}) {
  const rawText =
    typeof msg.content === "string"
      ? msg.content
      : Array.isArray(msg.content)
        ? (msg.content as Array<{ text?: string }>).map((b) => b.text ?? "").join(" ")
        : "";

  const attachments = extractUserAttachments(rawText);
  const cleanText = cleanUserMessageText(rawText);

  const images = attachments.filter((a) => a.type === "image");
  const nonImages = attachments.filter((a) => a.type !== "image");

  const { token } = useAuth();

  const isSteer = cleanText.startsWith("[Steer] ");
  const isFollowUp = cleanText.startsWith("[Follow-up] ");
  const displayText = isSteer
    ? cleanText.substring("[Steer] ".length)
    : isFollowUp
      ? cleanText.substring("[Follow-up] ".length)
      : cleanText;

  return (
    <div className="flex gap-3 justify-end my-1">
      <div className="max-w-[80%] sm:max-w-[75%] space-y-2 flex flex-col items-end">
        {cleanText && (
          <div
            className={clsx(
              "border rounded-2xl rounded-tr-md px-4 py-2.5 shadow-xs text-right max-w-full overflow-hidden transition-all duration-200",
              isSteer
                ? "bg-accent/5 border-accent/30 shadow-[0_0_12px_rgba(74,222,128,0.08)]"
                : isFollowUp
                  ? "bg-warning/5 border-warning/30 shadow-[0_0_12px_rgba(251,191,36,0.08)]"
                  : "bg-card border-border",
            )}
          >
            {(isSteer || isFollowUp) && (
              <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono font-bold tracking-wider select-none justify-start text-left">
                {isSteer ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-accent">STEERING COMMAND</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                    <span className="text-warning">FOLLOW-UP PROMPT</span>
                  </>
                )}
              </div>
            )}
            <div className="text-left">
              <RichMarkdown content={displayText} />
            </div>
            {msg.isError && <div className="mt-1.5 text-xs text-error">Error sending message</div>}
          </div>
        )}

        {images.length > 0 && (
          <div className="max-w-[550px] w-full">
            <ImageGrid
              images={images.map((img) => ({ url: img.path, title: img.name }))}
              sessionId={sessionId}
              activeProjectName={activeProjectName}
              activeAgentId={activeAgentId}
              activeChannelId={activeChannelId}
            />
          </div>
        )}

        {nonImages.length > 0 && (
          <div className="space-y-1.5 w-64">
            {nonImages.map((att, idx) => {
              const resolved = resolveFileUrl(att.path, sessionId, {
                project: activeProjectName,
                agentId: activeAgentId,
                channelId: activeChannelId,
              });
              const fileUrl =
                resolved.startsWith("/api/") && token ? `${resolved}&token=${token}` : resolved;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-card border border-input rounded-lg font-sans text-left w-full"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded bg-primary/15 flex items-center justify-center text-primary text-xs font-extrabold select-none shrink-0 border border-primary/20 uppercase">
                      {att.name.split(".").pop()?.substring(0, 3) || "doc"}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-semibold text-foreground truncate">
                        {att.name}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase font-mono">
                        {att.name.split(".").pop()}
                      </span>
                    </div>
                  </div>
                  <a
                    href={fileUrl}
                    download={att.name}
                    className="px-2 py-1 text-xs font-semibold rounded bg-primary text-background hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                  >
                    Download
                  </a>
                </div>
              );
            })}
          </div>
        )}
        {msg.timestamp && !msg.isStreaming && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {formatTimestampFromMsg(msg.timestamp)}
          </span>
        )}
        <BranchNav msg={msg} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function formatTimestampFromMsg(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return time;
  const sameYear = d.getFullYear() === now.getFullYear();
  const month = d.toLocaleString([], { month: "short", day: "numeric" });
  return sameYear ? `${month}, ${time}` : `${month}, ${d.getFullYear()}, ${time}`;
}

export function ToolApprovalCard({
  msg,
  onResolve,
  settledAction,
}: {
  msg: Message;
  onResolve?: (toolCallId: string, action: "confirm" | "deny") => void;
  settledAction?: "confirm" | "deny";
}) {
  const toolCallId = msg.toolCallId!;
  const toolName = msg.toolName || "tool";
  const reason = typeof msg.content === "string" ? msg.content : "Action requires approval";
  const args = msg.args || {};

  return (
    <div className="flex justify-start my-2 w-full">
      <div className="bg-[#171717] border border-yellow-500/30 border-l-2 border-l-yellow-500 text-text-secondary text-sm rounded-xl px-3 py-2.5 max-w-[85%] sm:max-w-[70%] shadow-lg flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shrink-0" />
          <span className="text-[10px] font-mono font-semibold text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">
            {toolName}
          </span>
          <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-yellow-500/60">
            Approval
          </span>
        </div>

        <p className="text-[11px] text-text-secondary leading-snug">{reason}</p>

        {Object.keys(args).length > 0 && (
          <div className="p-2 bg-[#121212] border border-border/50 rounded-lg text-[11px] font-mono overflow-x-auto max-w-full text-text-primary max-h-20 overflow-y-auto">
            {toolName === "bash" && args.command ? (
              <pre className="whitespace-pre-wrap break-words text-[11px] text-green-400">
                $ {args.command}
              </pre>
            ) : (
              <pre className="whitespace-pre-wrap break-words text-[11px]">
                {JSON.stringify(args, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {settledAction ? (
            <div
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border font-mono ${
                settledAction === "confirm"
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}
            >
              {settledAction === "confirm" ? "✓ Approved" : "✗ Denied"}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onResolve?.(toolCallId, "confirm")}
                className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-[#4ade80] text-[#121212] hover:opacity-90 active:scale-95 transition-all cursor-pointer font-sans"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => onResolve?.(toolCallId, "deny")}
                className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-[#202020] hover:bg-[#2a2a2a] text-text-primary border border-border hover:border-border-hover active:scale-95 transition-all cursor-pointer font-sans"
              >
                Deny
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
