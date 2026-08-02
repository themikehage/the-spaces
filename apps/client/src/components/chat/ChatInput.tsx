// SPDX-License-Identifier: MIT
import { useRef, useState, type KeyboardEvent } from "react";
import { ChatToolbar } from "./ChatToolbar";

export interface MentionTarget {
  id: string;
  name: string;
  type?: "agent" | "user" | "channel" | string;
  avatarUrl?: string;
}

export async function processAttachments(
  files: File[],
  _opts?: { activeProjectName?: string | null; activeAgentId?: string },
): Promise<{
  extraText: string;
  images: Array<{ type: "image"; data: string; mimeType: string }>;
}> {
  let extraText = "";
  const images: Array<{ type: "image"; data: string; mimeType: string }> = [];

  for (const file of files) {
    if (file.type.startsWith("image/")) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      images.push({ type: "image", data: base64, mimeType: file.type });
    } else {
      const text = await file.text();
      extraText += `\n\n--- Attachment: ${file.name} ---\n${text}\n--- End Attachment ---`;
    }
  }

  return { extraText, images };
}

interface Props {
  onSend: (text: string, attachments?: File[]) => void;
  onAbort?: () => void;
  streaming?: boolean;
  disabled?: boolean;
  sessionId?: string | null;
  mentionTargets?: MentionTarget[];
  activeChannelId?: string;
}

export function ChatInput({ onSend, onAbort, streaming, disabled }: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || streaming || disabled) return;
    onSend(trimmed, attachments);
    setText("");
    setAttachments([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 p-3 shadow-sm focus-within:ring-2 focus-within:ring-accent-500/20 transition-all">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-surface-200/50 dark:border-surface-800/50 text-xs">
          {attachments.map((f, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-surface-100 dark:bg-surface-800 rounded flex items-center gap-1 text-surface-700 dark:text-surface-300"
            >
              {f.name}
              <button
                onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                className="hover:text-red-500 ml-1"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (Press Enter to send, Shift+Enter for newline)"
        rows={2}
        disabled={disabled}
        className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400"
      />

      <ChatToolbar
        streaming={streaming}
        disabled={disabled || (!text.trim() && attachments.length === 0)}
        onSend={handleSend}
        onAbort={onAbort}
        onAttachFiles={(files) => setAttachments((prev) => [...prev, ...files])}
      />
    </div>
  );
}
