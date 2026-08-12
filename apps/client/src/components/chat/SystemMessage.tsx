import { useLiterals } from "@/lib";
import type { Message } from "@/lib/message-grouping";
import clsx from "clsx";
import { DELEGATION_NOTIFICATION_TYPE } from "shared";
import { literals as u } from "./MessageList.literals";

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

export { UserBubble } from "./UserBubble";


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
