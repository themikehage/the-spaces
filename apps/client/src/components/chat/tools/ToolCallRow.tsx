// SPDX-License-Identifier: MIT
import { useToolCallState } from "@/hooks/useToolCallState";
import { useLiterals } from "@/lib";
import { AlertCircle, ArrowRight, Check, ChevronRight, Package } from "lucide-react";
import { TOOL_META, getArgSummary, getResultSummary, getToolLabel } from "./tool-row-utils";
import { literals } from "./ToolCallRow.literals";
import { ToolResultRouter } from "./ToolResultRouter";

export interface ToolContentBlock {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolResultData {
  toolName: string;
  content: ToolContentBlock[];
  isError: boolean;
  details?: {
    diff?: string;
    patch?: string;
    firstChangedLine?: number;
    totalResults?: number;
    searchType?: string;
    results?: Array<{ title?: string; url: string; publishedDate?: string }>;
    synthesizedOutput?: string;
    costDollars?: number;
    count?: number;
    memories?: Array<{
      id: string;
      type: string;
      importance: number;
      content: string;
      tags?: string[];
    }>;
    status?: string;
    type?: string;
    importance?: number;
    tags?: string[];
    deletedId?: string;
    title?: string;
    cached?: boolean;
    truncated?: boolean;
    extractionMethod?: string;
    fetchDurationMs?: number;
    originalSize?: number;
    extractedSize?: number;
    url?: string;
    subagentSessionId?: string;
    task?: string;
    delegatorName?: string;
    delegatorId?: string;
    delegatorEntityType?: string;
  };
}

interface Props {
  toolName: string;
  args: Record<string, unknown>;
  result: ToolResultData | null;
  sessionId: string | null;
  toolCallId?: string;
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeChannelId?: string | null;
  activeTeamId?: string | null;
  disabled?: boolean;
  serialTools?: string[];
  onOpenSubagentConsole?: (toolCallId: string, targetType?: string, targetId?: string) => void;
}

export function ToolCallRow({
  toolName,
  args,
  result,
  sessionId: _sessionId,
  toolCallId,
  activeProjectName: _activeProjectName,
  activeAgentId: _activeAgentId = null,
  activeChannelId: _activeChannelId = null,
  activeTeamId = null,
  disabled = false,
  serialTools = ["request_approval", "ask_question"],
  onOpenSubagentConsole,
}: Props) {
  const l = useLiterals(literals);
  const isInteractive =
    serialTools.includes(toolName) ||
    toolName === "manage_delegations" ||
    toolName === "spawn_subagent" ||
    toolName === "delegate_task";

  const { expanded, toggleExpanded, activeResult, running, hasError } = useToolCallState({
    toolName,
    args,
    result,
    toolCallId,
    disabled,
  });

  const hasUiDetails = (result?.details as any)?.ui || (args as any)?.ui;
  const meta = TOOL_META[toolName] ?? {
    label: toolName,
    colorClass: "text-primary",
    icon: hasUiDetails ? (
      <Package size={13} strokeWidth={2.5} />
    ) : (
      <span className="w-3 h-3 rounded-full bg-text-secondary/30" />
    ),
  };

  const labelText = meta.label === toolName ? getToolLabel(toolName, l, args) : meta.label;
  const argSummary = getArgSummary(toolName, args, l);
  const resultSummary = activeResult ? getResultSummary(toolName, activeResult, l, args) : "";
  const isFullBleed = toolName === "render_html" || toolName === "render_chart";

  return (
    <div
      className={`my-1.5 rounded-lg border overflow-hidden transition-all ${
        disabled
          ? "border-input/30 bg-card/25 opacity-60 select-none pointer-events-none"
          : hasError
            ? "border-error/40 bg-destructive/5"
            : "border-input bg-card/50"
      }`}
    >
      <button
        onClick={toggleExpanded}
        disabled={disabled}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-card-hover/40 transition-colors text-left cursor-pointer disabled:cursor-default"
      >
        <span className={`flex-shrink-0 ${meta.colorClass}`}>{meta.icon}</span>

        <span className={`font-mono font-bold text-xs flex-shrink-0 ${meta.colorClass}`}>
          {labelText}
        </span>

        {toolName === "spawn_subagent" && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary bg-surface-hover px-1.5 py-0.5 rounded flex-shrink-0">
            {(args.subagentType as string) || "builder"}
          </span>
        )}

        {toolName === "delegate_task" && (
          <>
            <span className="text-[10px]">
              <ArrowRight className="w-2 h-2" />
            </span>
            <span className="text-[10px] font-bold tracking-wider text-primary bg-surface-hover px-1.5 py-0.5 rounded flex-shrink-0">
              {String(args.targetId)}
            </span>
          </>
        )}

        {toolName === "manage_delegations" && (
          <>
            {args.action === "spawn" ? (
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary bg-surface-hover px-1.5 py-0.5 rounded flex-shrink-0">
                {String(args.subagentRole || args.subagentType || "builder")}
              </span>
            ) : (
              <>
                <span className="text-[10px]">
                  <ArrowRight className="w-2.5 h-2.5 text-text-secondary" />
                </span>
                <span className="text-[10px] font-bold tracking-wider text-primary bg-surface-hover px-1.5 py-0.5 rounded flex-shrink-0">
                  {String(args.targetId || args.targetType || "")}
                </span>
              </>
            )}
          </>
        )}

        <span className="font-mono text-[11px] text-muted-foreground truncate min-w-0 flex-1">
          {argSummary}
        </span>

        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {running ? (
            disabled ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 animate-pulse" />
                esperando respuesta anterior...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-warning">
                <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                {isInteractive ? "pendiente" : "running"}
              </span>
            )
          ) : hasError ? (
            <span className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle size={12} />
              error
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check size={11} className="text-primary/70" />
              {resultSummary}
            </span>
          )}

          {!running && !disabled && (
            <ChevronRight
              size={11}
              className={`text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          )}
        </div>
      </button>

      {(!running || isInteractive || activeResult !== null) && expanded && (
        <div className={`border-t border-border bg-card-hover/20 ${isFullBleed ? "p-0" : "p-3"}`}>
          {!isFullBleed && Object.keys(args).length > 0 && (
            <details className="mb-2">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-mono text-[11px] select-none">
                {l.inputSummary}
              </summary>
              <pre className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words bg-muted/60 p-2.5 rounded-md max-h-64 overflow-y-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </details>
          )}
          <ToolResultRouter
            toolName={toolName}
            args={args}
            result={activeResult}
            toolCallId={toolCallId}
            sessionId={_sessionId}
            activeProjectName={_activeProjectName}
            activeAgentId={_activeAgentId}
            activeChannelId={_activeChannelId}
            activeTeamId={activeTeamId}
            onOpenSubagentConsole={onOpenSubagentConsole}
            l={l}
          />
        </div>
      )}
    </div>
  );
}
