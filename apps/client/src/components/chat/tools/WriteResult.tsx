// SPDX-License-Identifier: MIT
import { AlertCircle, Check } from "lucide-react";
import { openInWorkspace } from "./workspace";

interface Props {
  text: string;
  isError: boolean;
}

export function WriteResult({ text, isError }: Props) {
  const bytesMatch = text.match(/(\d+)\s+bytes/);
  const pathMatch = text.match(/to\s+(.+)$/);
  const bytes = bytesMatch ? Number(bytesMatch[1]) : null;
  const path = pathMatch ? pathMatch[1].trim() : null;

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-destructive text-xs">
        <AlertCircle size={14} />
        <span className="font-mono">{text}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Check size={14} className="text-primary flex-shrink-0" />
        <span className="text-primary text-xs font-semibold">Written</span>
      </div>
      {path && (
        <button
          onClick={() => openInWorkspace(path)}
          className="font-mono text-[11px] text-primary/80 hover:underline underline-offset-2 truncate cursor-pointer hover:text-primary transition-colors"
        >
          {path}
        </button>
      )}
      {bytes !== null && (
        <span className="text-xs text-muted-foreground ml-auto flex-shrink-0 font-mono">
          {bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`}
        </span>
      )}
    </div>
  );
}
