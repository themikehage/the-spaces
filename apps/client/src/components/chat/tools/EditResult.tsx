// SPDX-License-Identifier: MIT
import { AlertCircle } from "lucide-react";
import { openInWorkspace } from "./workspace";

interface DiffLine {
  type: "add" | "remove" | "context" | "hunk";
  lineNum?: number;
  content: string;
}

function parseDiff(diff: string): DiffLine[] {
  const lines: DiffLine[] = [];
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("@@")) {
      lines.push({ type: "hunk", content: raw });
      continue;
    }
    if (raw.startsWith("---") || raw.startsWith("+++")) continue;
    const sign = raw[0];
    if (sign === "+") {
      const rest = raw.slice(1);
      const spaceIdx = rest.indexOf(" ");
      const content = spaceIdx >= 0 ? rest.slice(spaceIdx + 1) : rest;
      const lineNum = spaceIdx >= 0 ? Number(rest.slice(0, spaceIdx)) : undefined;
      lines.push({ type: "add", lineNum, content });
    } else if (sign === "-") {
      const rest = raw.slice(1);
      const spaceIdx = rest.indexOf(" ");
      const content = spaceIdx >= 0 ? rest.slice(spaceIdx + 1) : rest;
      const lineNum = spaceIdx >= 0 ? Number(rest.slice(0, spaceIdx)) : undefined;
      lines.push({ type: "remove", lineNum, content });
    } else if (sign === " ") {
      const rest = raw.slice(1);
      const spaceIdx = rest.indexOf(" ");
      const content = spaceIdx >= 0 ? rest.slice(spaceIdx + 1) : rest;
      const lineNum = spaceIdx >= 0 ? Number(rest.slice(0, spaceIdx)) : undefined;
      lines.push({ type: "context", lineNum, content });
    }
  }
  return lines;
}

function buildDiffFromArgs(args?: Record<string, unknown>): DiffLine[] {
  if (!args) return [];
  const lines: DiffLine[] = [];
  const edits = Array.isArray(args.edits) ? args.edits : [args];

  for (let idx = 0; idx < edits.length; idx++) {
    const chunk = edits[idx];
    const target = String(chunk.targetContent || chunk.oldText || chunk.old_string || "");
    const replacement = String(
      chunk.replacementContent || chunk.newText || chunk.new_string || "",
    );

    if (!target && !replacement) continue;

    if (edits.length > 1) {
      lines.push({ type: "hunk", content: `@@ Edit Block ${idx + 1} @@` });
    }

    if (target) {
      for (const line of target.split("\n")) {
        lines.push({ type: "remove", content: line });
      }
    }
    if (replacement) {
      for (const line of replacement.split("\n")) {
        lines.push({ type: "add", content: line });
      }
    }
  }
  return lines;
}

interface Props {
  text: string;
  filePath?: string;
  details?: {
    diff?: string;
    patch?: string;
    firstChangedLine?: number;
  };
  args?: Record<string, unknown>;
  isError: boolean;
}

export function EditResult({ text, filePath, details, args, isError }: Props) {
  if (isError) {
    return (
      <div className="flex items-center gap-2 text-destructive text-xs font-mono">
        <AlertCircle size={12} />
        {text}
      </div>
    );
  }

  const lines = details?.diff ? parseDiff(details.diff) : buildDiffFromArgs(args);

  if (lines.length === 0) {
    return (
      <div className="space-y-1.5">
        {filePath && (
          <button
            onClick={() => openInWorkspace(filePath)}
            className="font-mono text-[11px] text-primary/70 hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer block"
          >
            {filePath}
          </button>
        )}
        <p className="text-primary text-xs font-mono">{text}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-1.5">
      {filePath && (
        <button
          onClick={() => openInWorkspace(filePath)}
          className="font-mono text-[11px] text-primary/70 hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer block"
        >
          {filePath}
        </button>
      )}
      <div className="font-mono text-[11px] rounded-md overflow-hidden border border-input/40">
        {lines.map((line, i) => {
          if (line.type === "hunk") {
            return (
              <div key={i} className="px-3 py-0.5 bg-primary/5 text-primary/50 text-xs">
                {line.content}
              </div>
            );
          }
          const bgClass =
            line.type === "add"
              ? "bg-primary/8 border-l-2 border-success/50"
              : line.type === "remove"
                ? "bg-destructive/8 border-l-2 border-error/50"
                : "border-l-2 border-transparent";
          const textClass =
            line.type === "add"
              ? "text-primary"
              : line.type === "remove"
                ? "text-destructive/80"
                : "text-muted-foreground";
          const prefix = line.type === "add" ? "+" : line.type === "remove" ? "−" : " ";

          return (
            <div key={i} className={`flex items-start gap-2 px-3 py-0.5 ${bgClass}`}>
              {line.lineNum !== undefined && (
                <span className="text-muted-foreground w-5 flex-shrink-0 text-right select-none">
                  {line.lineNum}
                </span>
              )}
              <span className={`flex-shrink-0 select-none ${textClass}`}>{prefix}</span>
              <span className={`break-words ${textClass}`}>{line.content}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
