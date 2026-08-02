// SPDX-License-Identifier: MIT
import { AlertTriangle, CheckCircle2, Loader2, Terminal } from "lucide-react";
import { useState } from "react";

interface Props {
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  isError?: boolean;
  isStreaming?: boolean;
}

export function ToolCallCard({ toolName, args, result, isError, isStreaming }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-surface-200 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-900/50 overflow-hidden text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-200/50 dark:hover:bg-surface-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 font-mono font-medium">
          <Terminal className="w-4 h-4 text-accent-500" />
          <span>{toolName}</span>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
          ) : isError ? (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
          <span className="text-xs text-surface-500">{expanded ? "Hide" : "Details"}</span>
        </div>
      </button>

      {expanded && (
        <div className="p-3 border-t border-surface-200 dark:border-surface-800 space-y-2 font-mono text-xs overflow-x-auto">
          {args && (
            <div>
              <div className="text-surface-500 mb-1 font-sans">Arguments:</div>
              <pre className="bg-surface-950 text-surface-100 p-2 rounded max-h-40 overflow-y-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {result !== undefined && result !== null && (
            <div>
              <div className="text-surface-500 mb-1 font-sans">Result:</div>
              <pre className="bg-surface-950 text-surface-100 p-2 rounded max-h-40 overflow-y-auto">
                {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
