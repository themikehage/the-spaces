// SPDX-License-Identifier: MIT
import { Paperclip, Send, Square } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { ModelSelector } from "./ModelSelector";

interface Props {
  streaming?: boolean;
  disabled?: boolean;
  onSend: () => void;
  onAbort?: () => void;
  onAttachFiles?: (files: File[]) => void;
  sessionId?: string | null;
}

export function ChatToolbar({ streaming, disabled, onSend, onAbort, onAttachFiles, sessionId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onAttachFiles) {
      onAttachFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="flex items-center justify-between pt-2 border-t border-surface-200/50 dark:border-surface-800/50">
      <div className="flex items-center gap-1.5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          title="Attach files"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <ModelSelector sessionId={sessionId ?? null} disabled={disabled} compact={true} />
      </div>

      <div className="flex items-center gap-2">
        {streaming ? (
          <button
            type="button"
            onClick={onAbort}
            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={disabled}
            className="p-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        )}
      </div>
    </div>
  );
}
