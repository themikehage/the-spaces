import {
  Globe,
  MousePointer,
  Type,
  Eye,
  Scroll,
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { useState } from "react";

export interface BrowserPanelProps {
  action?: string;
  args?: Record<string, any>;
  output?: unknown;
  details?: Record<string, any>;
  isStreaming?: boolean;
  isError?: boolean;
}

const ACTION_ICONS: Record<string, any> = {
  open: Globe,
  click: MousePointer,
  fill: Type,
  type: Type,
  snapshot: Eye,
  scroll: Scroll,
  read: Eye,
  eval: Terminal,
  screenshot: ImageIcon,
};

export function BrowserPanel({
  action: actionProp,
  args,
  output,
  details: detailsProp,
  isStreaming,
  isError,
}: BrowserPanelProps) {
  const [showRawOutput, setShowRawOutput] = useState(false);

  const rawOutputObj = typeof output === "object" && output !== null ? (output as any) : null;
  const contentText =
    rawOutputObj?.content?.[0]?.text ?? (typeof output === "string" ? output : null);
  const details = detailsProp || rawOutputObj?.details;

  const action = actionProp || args?.action || details?.action || "navigate";
  const Icon = ACTION_ICONS[action] || Globe;

  const url = args?.url || details?.url;
  const selector = args?.selector;
  const textParam = args?.text;
  const command = details?.command ? `agent-browser ${details.command.join(" ")}` : null;

  const textOutput =
    contentText ??
    (typeof output === "object" && output !== null
      ? JSON.stringify(output, null, 2)
      : String(output ?? ""));

  const isSnapshot =
    action === "snapshot" || textOutput.includes("[ref=") || textOutput.includes("@e");

  // Format snapshot accessibility tree lines to highlight refs (@e1, @e2)
  const renderFormattedSnapshot = (text: string) => {
    return text.split("\n").map((line, idx) => {
      // Highlight ref patterns like @e12 or [ref=e12]
      const parts = line.split(/(@e\d+|\[ref=e\d+\])/g);
      return (
        <div key={idx} className="hover:bg-white/5 px-1 py-0.5 rounded transition-colors">
          {parts.map((part, pIdx) => {
            if (/^@e\d+$/.test(part) || /^\[ref=e\d+\]$/.test(part)) {
              return (
                <span
                  key={pIdx}
                  className="font-bold text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded mx-0.5"
                >
                  {part}
                </span>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="font-mono text-xs bg-[#14141f] rounded-lg border border-border/70 overflow-hidden my-2 shadow-lg">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#1c1c2b] border-b border-border/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded bg-violet-500/10 text-violet-400">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-foreground uppercase tracking-wider text-[11px] px-1.5 py-0.5 bg-surface-hover/80 rounded border border-border/40">
            {action}
          </span>
          {url && (
            <span
              className="text-sky-400 font-medium truncate text-[11px] max-w-[280px]"
              title={url}
            >
              {url}
            </span>
          )}
          {selector && (
            <span className="text-amber-300 font-medium truncate text-[11px]" title={selector}>
              {selector}
            </span>
          )}
          {textParam && (
            <span className="text-muted-foreground truncate text-[11px] italic max-w-[150px]">
              "{textParam}"
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isStreaming ? (
            <span className="flex items-center gap-1.5 text-primary text-[11px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Navegando...</span>
            </span>
          ) : isError ? (
            <span className="flex items-center gap-1 text-destructive text-[11px]">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Error</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Listo</span>
            </span>
          )}
        </div>
      </div>

      {/* Command prompt sub-header */}
      {command && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#181826] border-b border-border/30 text-[11px]">
          <div className="flex items-center gap-2 text-muted-foreground truncate">
            <Terminal className="h-3 w-3 text-muted-foreground/70 shrink-0" />
            <span className="text-foreground/80 font-mono text-[10px] truncate">{command}</span>
          </div>
          <button
            onClick={() => setShowRawOutput(!showRawOutput)}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {showRawOutput ? "Ver formato" : "Ver raw"}
          </button>
        </div>
      )}

      {/* Output Content */}
      <div className="p-3 max-h-72 overflow-y-auto text-foreground/90 leading-relaxed text-[11px]">
        {showRawOutput || !isSnapshot ? (
          <pre className="whitespace-pre-wrap font-mono text-muted-foreground">
            {textOutput || (isStreaming ? "Esperando respuesta del navegador..." : "(sin output)")}
            {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />}
          </pre>
        ) : (
          <div className="font-mono text-emerald-300/90 whitespace-pre">
            {renderFormattedSnapshot(textOutput)}
          </div>
        )}
      </div>
    </div>
  );
}
