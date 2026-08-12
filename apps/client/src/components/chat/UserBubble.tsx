import { useAuth } from "@/contexts/AuthContext";
import { resolveFileUrl } from "@/lib/file-urls";
import type { Message } from "@/lib/message-grouping";
import clsx from "clsx";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { ImageGrid } from "./ImageGrid";
import { RichMarkdown } from "./RichMarkdown";
import { BranchNav } from "./SystemMessage";
import { getFileType, type MediaType } from "./ToolResultInspector";

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
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayText || rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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

        <div className="flex items-center gap-2.5 font-mono text-[10px] text-muted-foreground select-none">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
            title={copied ? "Copiado!" : "Copiar mensaje"}
          >
            {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
            <span>{copied ? "Copiado" : "Copiar"}</span>
          </button>
          {msg.timestamp && !msg.isStreaming && (
            <span>{formatTimestampFromMsg(msg.timestamp)}</span>
          )}
          <BranchNav msg={msg} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}
