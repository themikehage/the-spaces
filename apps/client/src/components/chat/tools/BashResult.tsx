// SPDX-License-Identifier: MIT
import { Terminal } from "lucide-react";

interface Props {
  text: string;
  command: string;
  isError: boolean;
}

export function BashResult({ text, command, isError }: Props) {
  return (
    <div className="w-full rounded-md overflow-hidden border border-input/40">
      <div className="flex items-start gap-2 px-3 py-1.5 bg-muted border-b border-input/30">
        <Terminal size={12} className="text-muted-foreground flex-shrink-0 mt-0.5" />
        <span className="font-mono text-xs text-muted-foreground whitespace-pre-wrap break-words flex-1 min-w-0">
          {command}
        </span>
        {isError && (
          <span className="ml-auto flex-shrink-0 text-xs font-semibold text-destructive uppercase tracking-wider">
            error
          </span>
        )}
      </div>
      <pre
        className={`font-mono text-[11px] leading-relaxed px-3 py-2.5 bg-muted max-h-64 overflow-y-auto whitespace-pre-wrap break-words ${
          isError ? "text-destructive/80" : "text-foreground"
        }`}
      >
        {text}
      </pre>
    </div>
  );
}
