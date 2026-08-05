import { FileText } from "lucide-react";
import { RichMarkdown } from "../RichMarkdown.tsx";

interface ReadResultProps {
  path?: string;
  content?: string;
}

export function ReadResult({ path, content }: ReadResultProps) {
  const fileExt = path?.split(".").pop() || "";
  const markdownWrapper = `\`\`\`${fileExt}\n${content || ""}\n\`\`\``;

  return (
    <div className="rounded-md border border-border/60 bg-surface/50 overflow-hidden my-1">
      {path && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border-b border-border/40 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-foreground">{path}</span>
        </div>
      )}
      <div className="p-2 max-h-72 overflow-y-auto">
        <RichMarkdown content={markdownWrapper} />
      </div>
    </div>
  );
}
