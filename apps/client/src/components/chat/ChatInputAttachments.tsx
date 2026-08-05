// SPDX-License-Identifier: MIT
import type { Attachment } from "@/hooks/useChatInputForm";
import { X } from "lucide-react";

interface ChatInputAttachmentsProps {
  attachments: Attachment[];
  onRemoveAttachment: (id: string) => void;
}

export function ChatInputAttachments({
  attachments,
  onRemoveAttachment,
}: ChatInputAttachmentsProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2 px-1">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="relative group flex items-center gap-2 bg-card border border-input rounded-lg p-1.5 pr-2 max-w-[200px]"
        >
          {att.type === "image" && att.previewUrl ? (
            <img
              src={att.previewUrl}
              alt="attachment preview"
              className="w-8 h-8 object-cover rounded"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-mono text-[10px] font-bold uppercase shrink-0">
              {att.file.name.split(".").pop() || "doc"}
            </div>
          )}
          <span className="text-xs text-foreground truncate font-medium flex-1">
            {att.file.name}
          </span>
          <button
            type="button"
            onClick={() => onRemoveAttachment(att.id)}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
