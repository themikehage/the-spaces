// SPDX-License-Identifier: MIT
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ToolResultData } from "./ToolCallRow";

interface Props {
  text: string;
  details?: ToolResultData["details"];
  l: Record<string, string>;
}

const VISIBLE_COUNT = 5;

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

interface ExtractedResult {
  title?: string;
  url: string;
  publishedDate?: string;
  snippet?: string;
}

function parseTextResults(text: string): ExtractedResult[] {
  if (!text) return [];
  const trimmed = text.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const jsonArr = JSON.parse(trimmed);
      if (Array.isArray(jsonArr) && jsonArr.length > 0) {
        return jsonArr
          .map((item) => {
            if (typeof item === "object" && item !== null && item.url) {
              return {
                title: item.title || item.name || "Untitled",
                url: item.url,
                publishedDate: item.publishedDate || item.published_date,
                snippet: item.snippet || item.text || item.content,
              };
            }
            return null;
          })
          .filter(Boolean) as ExtractedResult[];
      }
    } catch {
      // Ignore JSON parse error and fallback to pattern matching
    }
  }

  const items: ExtractedResult[] = [];
  const blocks = text.split(/(?=\n?\d+\.\s+)/);
  for (const block of blocks) {
    const titleMatch = block.match(/\d+\.\s+(.+?)(?:\r?\n|$)/);
    const urlMatch = block.match(/URL:\s*(https?:\/\/[^\s\r\n]+)/i);
    const dateMatch = block.match(/Published:\s*([^\r\n]+)/i);
    const snippetMatch = block.match(/>\s*([^\r\n]+)/);

    if (urlMatch) {
      items.push({
        title: titleMatch ? titleMatch[1].trim() : "Untitled",
        url: urlMatch[1].trim(),
        publishedDate: dateMatch ? dateMatch[1].trim() : undefined,
        snippet: snippetMatch ? snippetMatch[1].trim() : undefined,
      });
    }
  }
  return items;
}

export function ExaSearchResult({ text, details, l }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [synthOpen, setSynthOpen] = useState(false);

  const rawResults = details?.results ?? [];
  const parsedResults = rawResults.length > 0 ? rawResults : parseTextResults(text);
  const totalResults = details?.totalResults ?? parsedResults.length;
  const searchType = details?.searchType;
  const cost = details?.costDollars;
  const synthesized = details?.synthesizedOutput;

  if (parsedResults.length === 0 && !text.trim()) {
    return <p className="text-muted-foreground text-xs italic">{l.bodyNoResults}</p>;
  }

  const visibleResults = showAll ? parsedResults : parsedResults.slice(0, VISIBLE_COUNT);
  const hiddenCount = parsedResults.length - VISIBLE_COUNT;

  return (
    <div className="flex flex-col gap-2 font-mono text-[11px]">
      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
        <span className="text-highlight font-semibold">
          {totalResults} {l.resExaResults}
        </span>
        {searchType && (
          <span className="px-1.5 py-0.5 rounded bg-surface text-text-secondary text-[10px]">
            {searchType}
          </span>
        )}
        {cost != null && cost > 0 && (
          <span className="text-text-secondary text-[10px]">${cost.toFixed(4)}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {visibleResults.map((r, i) => (
          <div key={i} className="rounded-md border border-input/40 overflow-hidden">
            <div className="flex items-start gap-2 px-3 py-2 bg-card">
              <span className="text-muted-foreground flex-shrink-0 w-4 text-right select-none">
                {i + 1}.
              </span>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-semibold text-xs truncate block"
                >
                  {r.title || "Untitled"}
                </a>
                <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                  <span className="truncate">{extractDomain(r.url)}</span>
                  {r.publishedDate && (
                    <>
                      <span className="text-border">|</span>
                      <span>{formatDate(r.publishedDate)}</span>
                    </>
                  )}
                </div>
                {(r as any).snippet && (
                  <p className="text-[10.5px] text-text-secondary line-clamp-2 mt-1 leading-normal font-sans opacity-85">
                    {(r as any).snippet}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-highlight hover:underline cursor-pointer text-left"
        >
          {l.bodyShowMore.replace("{n}", String(hiddenCount))}
        </button>
      )}

      {synthesized && (
        <div className="rounded-md border border-input/40 overflow-hidden">
          <button
            onClick={() => setSynthOpen(!synthOpen)}
            className="flex items-center gap-2 w-full px-3 py-1.5 bg-card hover:bg-card-hover/40 transition-colors text-left cursor-pointer"
          >
            <ChevronRight
              size={10}
              className={`text-muted-foreground transition-transform ${synthOpen ? "rotate-90" : ""}`}
            />
            <span className="text-xs text-text-primary font-semibold">
              {l.bodySynthesizedOutput}
            </span>
          </button>
          {synthOpen && (
            <div className="px-3 py-2 border-t border-input/40 bg-bg text-text-secondary text-[11px] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {synthesized}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
