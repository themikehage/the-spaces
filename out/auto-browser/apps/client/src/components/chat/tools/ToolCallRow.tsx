import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  FileText,
  FileEdit,
  Search,
  FolderTree,
  Globe,
  Wrench,
  Loader2,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Code2,
  HelpCircle,
  ShieldAlert,
  Brain,
} from "lucide-react";
import { BashResult } from "./BashResult.tsx";
import { ReadResult } from "./ReadResult.tsx";
import { WriteResult } from "./WriteResult.tsx";
import { GrepResult, GlobResult, WebFetchResult } from "./GrepResult.tsx";
import { ChartView } from "./ChartView.tsx";
import { HtmlPreview } from "../HtmlPreview.tsx";
import { AskQuestionForm } from "./AskQuestionForm.tsx";
import { ApprovalForm } from "./ApprovalForm.tsx";
import { MemoryResult } from "./MemoryResult.tsx";
import { EditResult } from "./EditResult.tsx";
import { BrowserPanel } from "./BrowserPanel.tsx";
import { BrowserStreamPanel } from "./BrowserStreamPanel.tsx";

export interface ToolResultData {
  toolName: string;
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError: boolean;
  details?: Record<string, any>;
}

export interface ToolCallRowProps {
  toolCallId?: string;
  toolName: string;
  args?: any;
  result?: unknown;
  resultData?: ToolResultData | null;
  status?: "pending" | "running" | "done" | "error";
  isError?: boolean;
  partialResult?: unknown;
  sessionId?: string | null;
  onApproval?: (toolCallId: string, action: "confirm" | "cancel") => void;
  onAnswer?: (
    toolCallId: string,
    answer: { selectedOptions?: string[]; customAnswer?: string },
  ) => void;
}

const TOOL_META: Record<string, { icon: ReactNode; label: string; color: string }> = {
  bash: {
    icon: <Terminal className="h-3.5 w-3.5" />,
    label: "Bash Command",
    color: "text-emerald-400",
  },
  read_file: {
    icon: <FileText className="h-3.5 w-3.5" />,
    label: "Read File",
    color: "text-blue-400",
  },
  read: { icon: <FileText className="h-3.5 w-3.5" />, label: "Read File", color: "text-blue-400" },
  write_file: {
    icon: <FileEdit className="h-3.5 w-3.5" />,
    label: "Write File",
    color: "text-amber-400",
  },
  write: {
    icon: <FileEdit className="h-3.5 w-3.5" />,
    label: "Write File",
    color: "text-amber-400",
  },
  edit_file: {
    icon: <FileEdit className="h-3.5 w-3.5" />,
    label: "Edit File",
    color: "text-amber-400",
  },
  edit: { icon: <FileEdit className="h-3.5 w-3.5" />, label: "Edit File", color: "text-amber-400" },
  grep: {
    icon: <Search className="h-3.5 w-3.5" />,
    label: "Search Code",
    color: "text-purple-400",
  },
  glob: {
    icon: <FolderTree className="h-3.5 w-3.5" />,
    label: "Find Files",
    color: "text-cyan-400",
  },
  find: {
    icon: <FolderTree className="h-3.5 w-3.5" />,
    label: "Find Files",
    color: "text-cyan-400",
  },
  web_fetch: { icon: <Globe className="h-3.5 w-3.5" />, label: "Fetch URL", color: "text-sky-400" },
  webfetch: { icon: <Globe className="h-3.5 w-3.5" />, label: "Fetch URL", color: "text-sky-400" },
  render_chart: {
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    label: "Gráficos",
    color: "text-accent",
  },
  render_html: {
    icon: <Code2 className="h-3.5 w-3.5" />,
    label: "HTML Preview",
    color: "text-primary",
  },
  ask_question: {
    icon: <HelpCircle className="h-3.5 w-3.5" />,
    label: "Pregunta",
    color: "text-amber-400",
  },
  ask_approval: {
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
    label: "Aprobación",
    color: "text-error",
  },
  approval_request: {
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
    label: "Aprobación",
    color: "text-error",
  },
  memory_store: {
    icon: <Brain className="h-3.5 w-3.5" />,
    label: "Memoria Guardada",
    color: "text-accent",
  },
  memory_recall: {
    icon: <Brain className="h-3.5 w-3.5" />,
    label: "Memorias",
    color: "text-accent",
  },
  memory_forget: {
    icon: <Brain className="h-3.5 w-3.5" />,
    label: "Memoria Eliminada",
    color: "text-error",
  },
  browser_navigate: {
    icon: <Globe className="h-3.5 w-3.5" />,
    label: "Browser",
    color: "text-violet-400",
  },
};

export function ToolCallRow({
  toolCallId = "tool-id",
  toolName,
  args,
  result,
  resultData,
  status = "done",
  isError: isErrorProp,
  partialResult,
  sessionId = null,
  onApproval,
  onAnswer,
}: ToolCallRowProps) {
  const isInteractive =
    toolName === "render_html" ||
    toolName === "render_chart" ||
    toolName === "ask_question" ||
    toolName === "ask_approval" ||
    toolName === "approval_request" ||
    toolName === "browser_navigate";
  const [isOpen, setIsOpen] = useState(isInteractive);

  const meta = TOOL_META[toolName] || {
    icon: <Wrench className="h-3.5 w-3.5" />,
    label: toolName,
    color: "text-primary",
  };

  const isRunning = status === "pending" || status === "running";
  const isError = isErrorProp || resultData?.isError || false;
  const displayResult = resultData
    ? resultData.content?.[0]?.text
    : isRunning
      ? partialResult
      : result;

  const renderContent = () => {
    if (toolName === "render_chart") {
      const parsedArgs = typeof args === "object" && args !== null ? args : {};
      return <ChartView {...parsedArgs} />;
    }

    if (toolName === "render_html") {
      const htmlText =
        typeof displayResult === "string"
          ? displayResult
          : typeof args?.html === "string"
            ? args.html
            : "";
      return <HtmlPreview html={htmlText} title={args?.title} />;
    }

    if (toolName === "ask_question") {
      return (
        <AskQuestionForm
          toolCallId={toolCallId}
          args={args || {}}
          result={
            resultData
              ? { content: resultData.content, details: resultData.details, isError }
              : null
          }
          sessionId={sessionId}
          onAnswer={onAnswer}
        />
      );
    }

    if (toolName === "ask_approval" || toolName === "approval_request") {
      return (
        <ApprovalForm
          toolCallId={toolCallId}
          args={args || {}}
          result={resultData ? { content: resultData.content, isError } : null}
          sessionId={sessionId}
          onApproval={onApproval}
        />
      );
    }

    if (toolName.startsWith("memory_")) {
      const mode = toolName.includes("recall")
        ? "recall"
        : toolName.includes("forget")
          ? "forget"
          : "store";
      return <MemoryResult mode={mode} args={args} details={resultData?.details} />;
    }

    if (toolName === "edit" || toolName === "edit_file") {
      const path =
        typeof args === "object" && args !== null && "path" in args
          ? String((args as Record<string, unknown>).path)
          : undefined;
      return (
        <EditResult
          text={typeof displayResult === "string" ? displayResult : "Edit performed"}
          filePath={path}
          details={resultData?.details}
          isError={isError}
        />
      );
    }

    if (toolName === "bash") {
      const cmd =
        typeof args === "object" && args !== null && "command" in args
          ? String((args as Record<string, unknown>).command)
          : undefined;
      return <BashResult output={displayResult} command={cmd} isStreaming={isRunning} />;
    }

    if (toolName === "read_file" || toolName === "read") {
      const path =
        typeof args === "object" && args !== null && "path" in args
          ? String((args as Record<string, unknown>).path)
          : undefined;
      return (
        <ReadResult
          path={path}
          content={
            typeof displayResult === "string"
              ? displayResult
              : JSON.stringify(displayResult, null, 2)
          }
        />
      );
    }

    if (toolName === "write_file" || toolName === "write") {
      const path =
        typeof args === "object" && args !== null && "path" in args
          ? String((args as Record<string, unknown>).path)
          : undefined;
      return <WriteResult path={path} />;
    }

    if (toolName === "grep") {
      return <GrepResult matches={displayResult as any} />;
    }

    if (toolName === "glob" || toolName === "find") {
      return <GlobResult files={displayResult as any} />;
    }

    if (toolName === "web_fetch" || toolName === "webfetch") {
      const url =
        typeof args === "object" && args !== null && "url" in args
          ? String((args as Record<string, unknown>).url)
          : undefined;
      return (
        <WebFetchResult
          url={url}
          preview={typeof displayResult === "string" ? displayResult : undefined}
        />
      );
    }

    if (toolName === "browser_navigate") {
      const details = resultData?.details as Record<string, any> | undefined;
      const partialDetails =
        typeof partialResult === "object" && partialResult !== null
          ? (partialResult as Record<string, any>).details
          : undefined;

      const activeDetails = details ?? partialDetails;
      const hasStreamPort = activeDetails?.streamPort != null;

      if (hasStreamPort && sessionId) {
        return (
          <BrowserStreamPanel
            sessionId={sessionId}
            action={
              activeDetails?.action ??
              (typeof args === "object" && args !== null && "action" in args
                ? String(args.action)
                : undefined)
            }
            url={
              activeDetails?.url ??
              (typeof args === "object" && args !== null && "url" in args
                ? String(args.url)
                : undefined)
            }
            isStreaming={isRunning}
            isError={isError}
            elapsedMs={activeDetails?.elapsedMs}
            fallbackText={typeof displayResult === "string" ? displayResult : undefined}
          />
        );
      }

      return (
        <BrowserPanel
          action={
            typeof args === "object" && args !== null && "action" in args
              ? String(args.action)
              : undefined
          }
          args={args}
          output={displayResult}
          details={activeDetails}
          isStreaming={isRunning}
          isError={isError}
        />
      );
    }

    return (
      <div className="bg-surface p-2.5 rounded border border-border/50 font-mono text-xs text-foreground/90 overflow-x-auto">
        {JSON.stringify(displayResult || args, null, 2)}
      </div>
    );
  };

  return (
    <div className="my-1.5 rounded-lg border border-border/80 bg-surface/70 overflow-hidden text-xs w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface hover:bg-surface-hover/80 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className={meta.color}>{meta.icon}</span>
          <span className="font-semibold text-foreground">{meta.label}</span>
          <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
            {toolName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-primary text-[11px]">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Running...</span>
            </span>
          )}
          {!isRunning && !isError && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
          {!isRunning && isError && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}

          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-border/40 space-y-2 bg-background/40">
          {args !== undefined && args !== null && !isInteractive && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Arguments
              </span>
              <pre className="p-2 rounded bg-surface border border-border/40 font-mono text-[11px] text-muted-foreground overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          <div className="space-y-1">
            {!isInteractive && (
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Result
              </span>
            )}
            {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
}
