// SPDX-License-Identifier: MIT
import { File } from "lucide-react";
import { useLiterals } from "@/lib";
import { literals as u } from "./GrepResult.literals";
import { openInWorkspace } from "./workspace";

interface GrepLine {
  type: "match" | "context";
  file: string;
  lineNum: number;
  content: string;
}

function parseGrepOutput(text: string): GrepLine[] {
  const lines: GrepLine[] = [];
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    // Match line: file:linenum: content
    const matchResult = raw.match(/^(.+?):(\d+):\s?(.*)$/);
    if (matchResult) {
      lines.push({
        type: "match",
        file: matchResult[1],
        lineNum: Number(matchResult[2]),
        content: matchResult[3],
      });
      continue;
    }
    // Context line: file-linenum- content
    const contextResult = raw.match(/^(.+?)-(\d+)-\s?(.*)$/);
    if (contextResult) {
      lines.push({
        type: "context",
        file: contextResult[1],
        lineNum: Number(contextResult[2]),
        content: contextResult[3],
      });
    }
  }
  return lines;
}

function groupByFile(lines: GrepLine[]): Map<string, GrepLine[]> {
  const map = new Map<string, GrepLine[]>();
  for (const line of lines) {
    const existing = map.get(line.file) ?? [];
    existing.push(line);
    map.set(line.file, existing);
  }
  return map;
}

interface Props {
  text: string;
  args: Record<string, unknown>;
}

export function GrepResult({ text, args }: Props) {
  const l = useLiterals(u);
  const pattern = (args.pattern as string) || "";
  const lines = parseGrepOutput(text);
  const byFile = groupByFile(lines);
  const matchCount = lines.filter((l) => l.type === "match").length;

  if (lines.length === 0) {
    return <p className="text-muted-foreground text-xs italic">{l.noMatches}</p>;
  }

  return (
    <div className="space-y-2 font-mono text-[11px] w-full">
      <div className="text-xs text-muted-foreground">
        {`${matchCount} ${matchCount !== 1 ? l.matches : l.match}`}
        {pattern ? ` for /${pattern}/` : ""}
      </div>
      {Array.from(byFile.entries()).map(([file, fileLines]) => {
        const fileMatches = fileLines.filter((l) => l.type === "match").length;
        return (
          <div key={file} className="rounded-md overflow-hidden border border-input/40">
            <button
              key={file}
              onClick={() => openInWorkspace(file)}
              className="flex items-center gap-2 px-3 py-1 bg-card border-b border-input/40 w-full text-left hover:bg-card-hover/40 transition-colors cursor-pointer"
            >
              <File size={10} className="text-primary/60 flex-shrink-0" />
              <span className="text-primary/80 text-xs">{file}</span>
              <span className="ml-auto text-muted-foreground text-xs">{`${fileMatches} ${fileMatches !== 1 ? l.matches : l.match}`}</span>
            </button>
            <div className="divide-y divide-surface-hover/20">
              {fileLines.map((line, i) => {
                const isMatch = line.type === "match";
                const highlighted = pattern
                  ? line.content.replace(
                      new RegExp(`(${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
                      "|||$1|||",
                    )
                  : line.content;

                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 px-3 py-0.5 ${isMatch ? "bg-highlight/5" : ""}`}
                  >
                    <span className="text-muted-foreground w-6 flex-shrink-0 text-right select-none">
                      {line.lineNum}
                    </span>
                    <span className={isMatch ? "text-foreground" : "text-muted-foreground"}>
                      {highlighted.split("|||").map((part, j) =>
                        j % 2 === 1 ? (
                          <mark
                            key={j}
                            className="bg-highlight/25 text-highlight rounded-sm px-0.5"
                          >
                            {part}
                          </mark>
                        ) : (
                          part
                        ),
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
