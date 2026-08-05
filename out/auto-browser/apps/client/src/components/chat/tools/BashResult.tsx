import { Terminal } from "lucide-react";

interface BashResultProps {
  output?: unknown;
  command?: string;
  isStreaming?: boolean;
}

export function BashResult({ output, command, isStreaming }: BashResultProps) {
  const textOutput =
    typeof output === "string"
      ? output
      : typeof output === "object" && output !== null
        ? JSON.stringify(output, null, 2)
        : String(output ?? "");

  return (
    <div className="font-mono text-xs bg-[#181824] rounded-md border border-border/60 overflow-hidden my-1">
      {command && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#202030] border-b border-border/40 text-muted-foreground text-[11px]">
          <Terminal className="h-3 w-3 text-primary" />
          <span className="text-foreground font-medium">{command}</span>
        </div>
      )}
      <pre className="p-3 overflow-x-auto max-h-60 text-foreground/90 whitespace-pre-wrap leading-relaxed">
        {textOutput || (isStreaming ? "Executing..." : "(empty output)")}
        {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />}
      </pre>
    </div>
  );
}
