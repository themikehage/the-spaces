import { FileCode, FilePlus, CheckCircle } from "lucide-react";

interface WriteResultProps {
  path?: string;
  bytesWritten?: number;
}

export function WriteResult({ path, bytesWritten }: WriteResultProps) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-md border border-success/30 bg-success/10 text-xs text-foreground font-mono">
      <FilePlus className="h-4 w-4 text-success shrink-0" />
      <span className="flex-1 font-semibold">{path || "File written"}</span>
      {bytesWritten !== undefined && (
        <span className="text-muted-foreground text-[11px]">{bytesWritten} bytes</span>
      )}
      <CheckCircle className="h-3.5 w-3.5 text-success" />
    </div>
  );
}

interface EditResultProps {
  path?: string;
  diff?: string;
}

export function EditResult({ path, diff }: EditResultProps) {
  return (
    <div className="rounded-md border border-border/60 bg-surface/50 overflow-hidden my-1 text-xs">
      {path && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border-b border-border/40 font-mono text-foreground">
          <FileCode className="h-3.5 w-3.5 text-warning" />
          <span>{path}</span>
        </div>
      )}
      {diff ? (
        <pre className="p-3 font-mono overflow-x-auto max-h-56 bg-[#181824] text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {diff}
        </pre>
      ) : (
        <div className="p-2.5 text-success font-mono flex items-center gap-2">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>File modified successfully</span>
        </div>
      )}
    </div>
  );
}
