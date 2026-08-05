import { Search, FolderTree, Globe } from "lucide-react";

export function GrepResult({
  matches,
}: {
  matches?: Array<{ file: string; line: number; content: string }> | string;
}) {
  const matchArray = Array.isArray(matches) ? matches : [];

  return (
    <div className="rounded-md border border-border/60 bg-[#181824] p-2.5 font-mono text-xs max-h-60 overflow-y-auto space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground mb-2 pb-1 border-b border-border/40 text-[11px]">
        <Search className="h-3 w-3 text-primary" />
        <span>Grep Matches</span>
      </div>
      {matchArray.length > 0 ? (
        matchArray.map((m, idx) => (
          <div
            key={idx}
            className="flex gap-2 text-foreground/90 hover:bg-surface-hover/50 p-1 rounded"
          >
            <span className="text-primary shrink-0">
              {m.file}:{m.line}
            </span>
            <span className="truncate text-muted-foreground">{m.content}</span>
          </div>
        ))
      ) : typeof matches === "string" ? (
        <pre className="whitespace-pre-wrap text-muted-foreground">{matches}</pre>
      ) : (
        <span className="text-muted-foreground italic">No matches found</span>
      )}
    </div>
  );
}

export function GlobResult({ files }: { files?: string[] | string }) {
  const fileList = Array.isArray(files) ? files : [];

  return (
    <div className="rounded-md border border-border/60 bg-surface/40 p-2.5 font-mono text-xs max-h-56 overflow-y-auto">
      <div className="flex items-center gap-2 text-muted-foreground mb-2 pb-1 border-b border-border/40 text-[11px]">
        <FolderTree className="h-3 w-3 text-primary" />
        <span>Matching Files ({fileList.length})</span>
      </div>
      <div className="space-y-1">
        {fileList.map((f, i) => (
          <div key={i} className="text-foreground/90 hover:text-primary transition-colors py-0.5">
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WebFetchResult({ url, preview }: { url?: string; preview?: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-surface/50 p-3 text-xs space-y-2">
      <div className="flex items-center gap-2 font-mono text-primary text-[11px] truncate">
        <Globe className="h-3.5 w-3.5 shrink-0" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline truncate"
        >
          {url || "Web Resource"}
        </a>
      </div>
      {preview && (
        <p className="text-muted-foreground line-clamp-4 leading-relaxed bg-background/50 p-2 rounded border border-border/30">
          {preview}
        </p>
      )}
    </div>
  );
}
