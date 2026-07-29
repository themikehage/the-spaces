// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { toSafeString, useLiterals } from "@/lib";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronRight,
  Database,
  Eye,
  ExternalLink,
  FileText,
  Folder,
  Globe,
  Image,
  Layers,
  List,
  Monitor,
  Package,
  PanelLeft,
  Pencil,
  PieChart,
  RefreshCw,
  Search,
  SearchX,
  UserCheck,
  Terminal,
  Trash2,
  Users,
} from "lucide-react";
import { HtmlPreview } from "../HtmlPreview";
import { ImageGrid } from "../ImageGrid";
import { ApprovalForm } from "./ApprovalForm";
import { AskQuestionForm } from "./AskQuestionForm";
import { BashResult } from "./BashResult";
import { ChartView } from "./ChartView";
import { DecomposeResult } from "./DecomposeResult";
import { EditResult } from "./EditResult";
import { ExaSearchResult } from "./ExaSearchResult";
import { FindResult } from "./FindResult";
import { GrepResult } from "./GrepResult";
import { LsResult } from "./LsResult";
import { MemoryResult } from "./MemoryResult";
import { ReadResult } from "./ReadResult";
import { ShareFileCard } from "./ShareFileCard";
import { SubagentLiveView } from "./SubagentLiveView";
import { literals } from "./ToolCallRow.literals";
import { WebFetchResult } from "./WebFetchResult";
import { WriteResult } from "./WriteResult";

import { CustomToolBody } from "./custom";

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

const TOOL_META: Record<string, { label: string; colorClass: string; icon: React.ReactNode }> = {
  ls: {
    label: "ls",
    colorClass: "text-primary",
    icon: <Folder size={13} />,
  },
  find: {
    label: "find",
    colorClass: "text-primary",
    icon: <Search size={13} strokeWidth={2.5} />,
  },
  write: {
    label: "write",
    colorClass: "text-primary",
    icon: <Pencil size={13} />,
  },
  read: {
    label: "read",
    colorClass: "text-muted-foreground",
    icon: <Eye size={13} />,
  },
  edit: {
    label: "edit",
    colorClass: "text-warning",
    icon: <FileText size={13} />,
  },
  grep: {
    label: "grep",
    colorClass: "text-highlight",
    icon: <SearchX size={13} strokeWidth={2.5} />,
  },
  bash: {
    label: "bash",
    colorClass: "text-primary",
    icon: <Terminal size={13} />,
  },
  request_approval: {
    label: "request_approval",
    colorClass: "text-warning",
    icon: <AlertCircle size={13} />,
  },
  ask_question: {
    label: "ask_question",
    colorClass: "text-warning",
    icon: <AlertCircle size={13} />,
  },
  render_images: {
    label: "render_images",
    colorClass: "text-primary",
    icon: <Image size={13} />,
  },
  render_html: {
    label: "render_html",
    colorClass: "text-primary",
    icon: <List size={13} />,
  },
  render_chart: {
    label: "render_chart",
    colorClass: "text-primary",
    icon: <PieChart size={13} />,
  },
  refresh_ui: {
    label: "refresh_ui",
    colorClass: "text-primary",
    icon: <RefreshCw size={13} />,
  },
  spawn_subagent: {
    label: "spawn_subagent",
    colorClass: "text-primary",
    icon: <PanelLeft size={13} strokeWidth={2.5} />,
  },
  delegate_task: {
    label: "delegate_task",
    colorClass: "text-primary",
    icon: <Users size={13} strokeWidth={2.5} />,
  },
  manage_delegations: {
    label: "manage_delegations",
    colorClass: "text-primary",
    icon: <UserCheck size={13} strokeWidth={2.5} />,
  },
  exa_search: {
    label: "exa_search",
    colorClass: "text-highlight",
    icon: <Search size={13} strokeWidth={2.5} />,
  },
  web_fetch: {
    label: "web_fetch",
    colorClass: "text-highlight",
    icon: <Globe size={13} strokeWidth={2.5} />,
  },
  memory_store: {
    label: "memory_store",
    colorClass: "text-accent",
    icon: <Database size={13} strokeWidth={2.5} />,
  },
  memory_recall: {
    label: "memory_recall",
    colorClass: "text-accent",
    icon: <Search size={13} strokeWidth={2.5} />,
  },
  memory_forget: {
    label: "memory_forget",
    colorClass: "text-error",
    icon: <Trash2 size={13} strokeWidth={2.5} />,
  },
  decompose_tasks: {
    label: "decompose_tasks",
    colorClass: "text-primary",
    icon: <List size={13} strokeWidth={2.5} />,
  },
  manage_custom_tools: {
    label: "manage_custom_tools",
    colorClass: "text-primary",
    icon: <Layers size={13} strokeWidth={2.5} />,
  },
  manage_preview: {
    label: "preview",
    colorClass: "text-emerald-500",
    icon: <Monitor size={13} strokeWidth={2.5} />,
  },
};

function getArgSummary(
  toolName: string,
  args: Record<string, unknown>,
  l: Record<string, string>,
): string {
  switch (toolName) {
    case "ls":
      return toSafeString(args.path, ".");
    case "find":
      return toSafeString(args.pattern);
    case "write":
      return toSafeString(args.path);
    case "read":
      return toSafeString(args.path);
    case "edit": {
      const path = toSafeString(args.path);
      const edits = Array.isArray(args.edits) ? args.edits.length : 0;
      return edits > 1 ? `${path} · ${edits} edits` : path;
    }
    case "grep": {
      const pat = toSafeString(args.pattern);
      const glob = toSafeString(args.glob, "*");
      return glob !== "*" ? `/${pat}/ in ${glob}` : `/${pat}/`;
    }
    case "bash": {
      const cmd = toSafeString(args.command);
      return cmd.length > 55 ? cmd.slice(0, 55) + "…" : cmd;
    }
    case "request_approval":
      return toSafeString(args.title, l.argApprovalRequest);
    case "ask_question":
      return toSafeString(args.question, l.argUserQuestion);
    case "render_images":
      return Array.isArray(args.images) ? `${args.images.length} ${l.argImages}` : "Images";
    case "render_html":
      return toSafeString(args.title, l.argHtmlDoc);
    case "render_chart":
      return toSafeString(args.title) || toSafeString(args.chartType, l.argChart);
    case "refresh_ui":
      return `${l.argUiRefresh}: ${toSafeString(args.entityType)}`;
    case "create_experiment":
      return toSafeString(args.name, "Experimento");
    case "spawn_subagent": {
      const task = toSafeString(args.task);
      const role = toSafeString(args.subagentRole);
      const cleanTask = task.length > 40 ? task.slice(0, 40) + "…" : task;
      return role ? `[${role}] ${cleanTask}` : cleanTask;
    }
    case "delegate_task": {
      return ``;
    }
    case "manage_delegations": {
      const task = toSafeString(args.task);
      return task.length > 55 ? task.slice(0, 55) + "…" : task;
    }
    case "exa_search": {
      const q = toSafeString(args.query);
      return q.length > 60 ? q.slice(0, 60) + "…" : q;
    }
    case "web_fetch": {
      const url = toSafeString(args.url);
      return url.length > 60 ? url.slice(0, 60) + "…" : url;
    }
    case "memory_recall": {
      const q = toSafeString(args.query);
      return q.length > 60 ? q.slice(0, 60) + "…" : q;
    }
    case "memory_store": {
      const c = toSafeString(args.content);
      return c.length > 50 ? c.slice(0, 50) + "…" : c;
    }
    case "memory_forget":
      return toSafeString(args.id);
    case "decompose_tasks": {
      const obj = toSafeString(args.objective);
      return obj.length > 50 ? obj.slice(0, 50) + "…" : obj;
    }
    case "manage_preview": {
      const action = toSafeString(args.action, "status");
      const fw = args.config ? ` (${toSafeString((args.config as any).framework)})` : "";
      return `${action}${fw}`;
    }
    default: {
      const keys = Object.keys(args || {});
      if (keys.length === 0) return "";
      const entries = Object.entries(args)
        .slice(0, 2)
        .map(([k, v]) => {
          const val = toSafeString(v);
          if (!val) return k;
          const short = val.length > 20 ? val.slice(0, 20) + "…" : val;
          return `${k}: ${short}`;
        })
        .join(", ");
      const more = keys.length > 2 ? ` +${keys.length - 2}` : "";
      return (entries + more).slice(0, 60);
    }
  }
}

function getResultSummary(
  toolName: string,
  result: ToolResultData,
  l: Record<string, string>,
  args: Record<string, unknown>,
): string {
  const text = result.content.find((b) => b.type === "text")?.text ?? "";
  if (result.isError) return "error";
  switch (toolName) {
    case "ls": {
      const n = text.trim().split("\n").filter(Boolean).length;
      return `${n} item${n !== 1 ? "s" : ""}`;
    }
    case "find": {
      const n = text.trim().split("\n").filter(Boolean).length;
      return `${n} file${n !== 1 ? "s" : ""}`;
    }
    case "write": {
      const m = text.match(/(\d+)\s+bytes/);
      return m ? `${m[1]} B` : "written";
    }
    case "read": {
      if (result.content.some((b) => b.type === "image")) return "image";
      const n = text.split("\n").length;
      return `${n} line${n !== 1 ? "s" : ""}`;
    }
    case "edit": {
      const m = text.match(/(\d+)\s+block/);
      return m ? `${m[1]} change${Number(m[1]) !== 1 ? "s" : ""}` : "edited";
    }
    case "grep": {
      const n = text.split("\n").filter((l) => /:[\d]+:/.test(l)).length;
      return `${n} match${n !== 1 ? "es" : ""}`;
    }
    case "bash":
      return "done";
    case "request_approval":
      return text || l.resWaiting;
    case "ask_question":
      return text || l.resWaiting;
    case "render_images":
      return l.resRendered;
    case "render_html":
      return l.resRendered;
    case "render_chart":
      return l.resRendered;
    case "share_file":
      return l.resShared;
    case "refresh_ui":
      return l.resRefreshed;
    case "create_experiment":
      return "creado/actualizado";
    case "spawn_subagent":
      return l.resCompleted;
    case "delegate_task":
      return l.resCompleted;
    case "manage_delegations":
      return l.resCompleted;
    case "exa_search": {
      const n = result.details?.totalResults ?? 0;
      return `${n} ${n !== 1 ? l.resExaResults : l.resExaResult}`;
    }
    case "web_fetch": {
      const title = result.details?.title || "";
      return title ? `"${title}"` : l.resCompleted;
    }
    case "memory_recall": {
      const n = result.details?.count ?? 0;
      return `${n} ${n !== 1 ? l.resMemories : l.resMemory}`;
    }
    case "memory_store":
      return l.resStored;
    case "memory_forget":
      return l.resForgotten;
    case "decompose_tasks":
      return l.resDecomposed;
    case "manage_preview": {
      if (result.isError) return "error";
      const action = (args.action as string) || "status";
      if (action === "build") {
        return text.includes("successfully") ? "build success" : "build failed";
      }
      return "completado";
    }
    default: {
      const details = result.details as any;
      if (details?.ui) return "ui";
      if (details?.stepLogs) return `${details.stepLogs.length} steps`;
      return "done";
    }
  }
}

function ToolBody({
  toolName,
  args,
  result,
  toolCallId,
  sessionId,
  activeProjectName,
  activeAgentId,
  activeChannelId,
  activeTeamId = null,
  onOpenSubagentConsole,
  l,
}: {
  toolName: string;
  args: Record<string, unknown>;
  result: ToolResultData | null;
  toolCallId?: string;
  sessionId?: string | null;
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeChannelId?: string | null;
  activeTeamId?: string | null;
  onOpenSubagentConsole?: (toolCallId: string, targetType?: string, targetId?: string) => void;
  l: Record<string, string>;
}) {
  const text = result?.content.find((b) => b.type === "text")?.text ?? "";

  switch (toolName) {
    case "decompose_tasks":
      return <DecomposeResult text={text} details={result?.details} l={l} />;
    case "create_experiment": {
      const details = result?.details as any;
      const expId = details?.experimentId || args.experimentId;
      const expName = details?.name || args.name || "Experimento";
      const agentsCount =
        details?.agentsCount || (Array.isArray(args.agents) ? args.agents.length : 0);
      const crit = details?.criteria || args.criteria || [];

      return (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface border border-border/80 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">
                Experimento Multi-Agente
              </span>
              <h4 className="text-sm font-bold text-text-primary">{expName}</h4>
            </div>
            {expId && (
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("select-lab-experiment", { detail: { id: expId } }),
                  );
                }}
                className="px-3 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                Ver Configuración
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-bg/50 border border-border/30">
              <span className="text-text-secondary font-medium">Agentes Configuradores</span>
              <span className="text-sm font-bold text-text-primary">{agentsCount} agentes</span>
            </div>
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-bg/50 border border-border/30">
              <span className="text-text-secondary font-medium">Criterios de Evaluación</span>
              <span className="text-sm font-bold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                {Array.isArray(crit) ? crit.join(", ") : "-"}
              </span>
            </div>
          </div>
        </div>
      );
    }
    case "manage_delegations": {
      const task = (args.task as string) || "";
      const isSpawn = args.action === "spawn";
      return (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-primary truncate flex-1">{task}</span>
            {onOpenSubagentConsole && (
              <button
                onClick={() => {
                  if (isSpawn) {
                    onOpenSubagentConsole(encodeURIComponent(toolCallId || ""));
                  } else {
                    onOpenSubagentConsole(
                      encodeURIComponent(toolCallId || ""),
                      String(args.targetType || ""),
                      String(args.targetId || ""),
                    );
                  }
                }}
                className="shrink-0 text-xs text-text-primary hover:text-accent transition-colors cursor-pointer underline underline-offset-2"
              >
                {isSpawn ? l.bodySubagentView : l.bodyViewLiveConsole}
              </button>
            )}
          </div>
          <SubagentLiveView toolCallId={toolCallId || ""} isComplete={result !== null} />
        </div>
      );
    }
    case "spawn_subagent": {
      const task = (args.task as string) || "";
      return (
        <div className="">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-primary truncate">{task}</span>
            {onOpenSubagentConsole && (
              <button
                onClick={() => onOpenSubagentConsole(encodeURIComponent(toolCallId || ""))}
                className="shrink-0 text-xs text-text-primary hover:text-accent transition-colors cursor-pointer underline underline-offset-2"
              >
                {l.bodySubagentView}
              </button>
            )}
          </div>
        </div>
      );
    }
    case "delegate_task": {
      const task = (args.task as string) || "";
      return (
        <div className="">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs text-text-primary truncate">{task}</span>
            </div>
            {onOpenSubagentConsole && (
              <button
                onClick={() =>
                  onOpenSubagentConsole(
                    encodeURIComponent(toolCallId || ""),
                    String(args.targetType || ""),
                    String(args.targetId || ""),
                  )
                }
                className="shrink-0 text-xs text-text-primary hover:text-accent transition-colors cursor-pointer underline underline-offset-2"
              >
                {l.bodyViewLiveConsole}
              </button>
            )}
          </div>
        </div>
      );
    }
    case "ls":
      return <LsResult text={text} />;
    case "find":
      return <FindResult text={text} />;
    case "write":
      return <WriteResult text={text} isError={result?.isError ?? false} />;
    case "read":
      return <ReadResult content={result?.content ?? []} args={args} />;
    case "edit":
      return (
        <EditResult
          text={text}
          filePath={(args.path as string) || undefined}
          details={result?.details}
          isError={result?.isError ?? false}
        />
      );
    case "grep":
      return <GrepResult text={text} args={args} />;
    case "bash":
      return (
        <BashResult
          text={text}
          command={(args.command as string) || ""}
          isError={result?.isError ?? false}
        />
      );
    case "request_approval":
      return (
        <ApprovalForm
          toolCallId={toolCallId || ""}
          args={args as any}
          result={result as any}
          sessionId={sessionId || null}
        />
      );
    case "ask_question":
      return (
        <AskQuestionForm
          toolCallId={toolCallId || ""}
          args={args as any}
          result={result as any}
          sessionId={sessionId || null}
        />
      );
    case "render_images":
      return (
        <ImageGrid
          images={(args.images as any) || []}
          sessionId={sessionId || null}
          activeProjectName={activeProjectName}
          activeAgentId={activeAgentId}
          activeChannelId={activeChannelId}
          activeTeamId={activeTeamId}
        />
      );
    case "generate_image":
      return (
        <div className="flex flex-col gap-2">
          {text && (
            <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-words bg-bg p-3 rounded-md border border-border/40 max-h-48 overflow-y-auto">
              {text}
            </pre>
          )}
          {(result?.details as any)?.images && (
            <ImageGrid
              images={((result?.details as any)?.images as any) || []}
              sessionId={sessionId || null}
              activeProjectName={activeProjectName}
              activeAgentId={activeAgentId}
              activeChannelId={activeChannelId}
              activeTeamId={activeTeamId}
            />
          )}
        </div>
      );
    case "render_html":
      return (
        <HtmlPreview
          html={(args.html as string) || ""}
          title={args.title as string | undefined}
          fullBleed
        />
      );
    case "render_chart":
      return (
        <ChartView
          chartType={args.chartType as any}
          title={args.title as any}
          data={args.data as any}
          config={args.config as any}
        />
      );
    case "share_file":
      return (
        <ShareFileCard
          filePath={(args.filePath as string) || ""}
          title={args.title as string | undefined}
          sessionId={sessionId || null}
          activeProjectName={activeProjectName}
          activeAgentId={activeAgentId}
          activeChannelId={activeChannelId}
          activeTeamId={activeTeamId}
        />
      );
    case "refresh_ui":
      return (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg border border-primary/30 text-primary-foreground text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span>
            {l.bodyWorkspaceRefreshed}
            {String(args.entityType)}
          </span>
        </div>
      );
    case "exa_search":
      return <ExaSearchResult text={text} details={result?.details} l={l} />;
    case "web_fetch":
      return <WebFetchResult text={text} details={result?.details} l={l} />;
    case "memory_recall":
      return <MemoryResult mode="recall" details={result?.details} l={l} />;
    case "memory_store":
      return <MemoryResult mode="store" args={args} details={result?.details} l={l} />;
    case "memory_forget":
      return <MemoryResult mode="forget" details={result?.details} l={l} />;
    case "manage_custom_tools":
      return (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg border border-primary/30 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>{text || "Custom tools metadata updated"}</span>
        </div>
      );
    case "manage_preview": {
      const action = (args.action as string) || "status";
      const config = args.config as any;
      const details = result?.details as any;
      const previewPagePath = details?.previewPagePath;

      return (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface border border-border/80 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h4 className="text-sm font-bold text-text-primary capitalize">{action}</h4>
            </div>
            <div className="flex items-center gap-2">
              {previewPagePath && (
                <Link
                  to={previewPagePath}
                  className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 hover:text-emerald-400 text-[11px] font-bold flex items-center gap-1 transition-all"
                >
                  <ExternalLink size={11} strokeWidth={2.5} className="shrink-0" />
                  Open Preview
                </Link>
              )}
              {details?.config && (
                <span className="px-2 py-0.5 rounded bg-bg text-text-secondary font-mono text-[10px]">
                  {details.config.framework}
                </span>
              )}
            </div>
          </div>

          {config && (
            <div className="grid grid-cols-2 gap-2 text-xs border border-border/30 rounded-lg p-2.5 bg-bg/40">
              <div className="flex flex-col gap-0.5">
                <span className="text-text-secondary font-medium">Framework</span>
                <span className="font-bold text-text-primary uppercase">{config.framework}</span>
              </div>
              {config.buildCommand && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-text-secondary font-medium">Build Command</span>
                  <span className="font-mono text-text-primary truncate">
                    {config.buildCommand}
                  </span>
                </div>
              )}
            </div>
          )}

          {details?.state && (
            <div className="grid grid-cols-3 gap-2 text-[11px] border border-border/30 rounded-lg p-2.5 bg-bg/40 font-mono">
              <div className="flex flex-col gap-0.5">
                <span className="text-text-secondary">Status</span>
                <span className="font-semibold text-text-primary">{details.state.status}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-text-secondary">Dist Exists</span>
                <span
                  className={
                    details.state.distExists
                      ? "text-emerald-500 font-semibold"
                      : "text-warning font-semibold"
                  }
                >
                  {details.state.distExists ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-text-secondary">Index HTML</span>
                <span
                  className={
                    details.state.indexHtmlExists
                      ? "text-emerald-500 font-semibold"
                      : "text-warning font-semibold"
                  }
                >
                  {details.state.indexHtmlExists ? "Yes" : "No"}
                </span>
              </div>
            </div>
          )}

          {text && (
            <pre className="text-[11px] font-mono text-text-secondary whitespace-pre-wrap break-words bg-bg p-3 rounded-lg border border-border/40 max-h-48 overflow-y-auto">
              {text}
            </pre>
          )}
        </div>
      );
    }
    default: {
      const details = result?.details as any;
      const uiDef = details?.ui || (args as any)?.ui;
      const presentation = details?.presentation || (args as any)?.presentation;

      if (uiDef) {
        return (
          <div className="flex flex-col gap-2 w-full">
            <CustomToolBody ui={uiDef} presentation={presentation} sessionId={sessionId || null} />
            {text && (
              <details className="mt-1 text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-mono text-[11px] select-none">
                  Pipeline Raw Output
                </summary>
                <pre className="mt-1 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-words bg-muted/60 p-2.5 rounded-md max-h-48 overflow-y-auto">
                  {text}
                </pre>
              </details>
            )}
          </div>
        );
      }
      return (
        <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-words bg-muted p-3 rounded-md max-h-48 overflow-y-auto">
          {text}
        </pre>
      );
    }
  }
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

  const [partialResult, setPartialResult] = useState<any>(null);

  useEffect(() => {
    if (!toolCallId || result !== null) return;

    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.partialResult) {
        setPartialResult(detail.partialResult);
      }
    };

    window.addEventListener(`tool-update-${toolCallId}`, handleUpdate);
    return () => {
      window.removeEventListener(`tool-update-${toolCallId}`, handleUpdate);
    };
  }, [toolCallId, result]);

  const resultPresentation = (result?.details as any)?.presentation;
  const isCustomTool =
    ![
      "read",
      "write",
      "edit",
      "bash",
      "grep",
      "find",
      "ls",
      "request_approval",
      "ask_question",
      "render_images",
      "render_html",
      "render_chart",
      "share_file",
      "refresh_ui",
      "manage_delegations",
      "spawn_subagent",
      "delegate_task",
      "exa_search",
      "web_fetch",
      "decompose_tasks",
      "update_task_status",
      "complete_task_list",
      "memory_store",
      "memory_recall",
      "memory_forget",
      "create_experiment",
      "vision",
      "generate_image",
      "manage_factory",
      "manage_custom_tools",
    ].includes(toolName) && !toolName.startsWith("mcp_");

  const [expanded, setExpanded] = useState(() => {
    if (disabled) return false;
    if (resultPresentation?.defaultExpanded !== undefined) {
      return !!resultPresentation.defaultExpanded;
    }
    if (isCustomTool) {
      return true;
    }
    return (
      toolName === "edit" ||
      toolName === "bash" ||
      toolName === "request_approval" ||
      toolName === "ask_question" ||
      toolName === "render_images" ||
      toolName === "render_html" ||
      toolName === "render_chart" ||
      toolName === "share_file" ||
      toolName === "spawn_subagent" ||
      toolName === "delegate_task" ||
      toolName === "manage_delegations" ||
      toolName === "exa_search" ||
      toolName === "web_fetch" ||
      toolName === "memory_recall" ||
      toolName === "memory_store"
    );
  });

  const hasUiDetails = (result?.details as any)?.ui || (args as any)?.ui;
  const meta = TOOL_META[toolName] ?? {
    label: toolName,
    colorClass: "text-primary",
    icon: hasUiDetails ? <Package size={13} strokeWidth={2.5} /> : (
      <span className="w-3 h-3 rounded-full bg-text-secondary/30" />
    ),
  };

  const getToolLabel = (name: string, toolArgs?: Record<string, unknown>): string => {
    switch (name) {
      case "request_approval":
        return l.labelApproval;
      case "ask_question":
        return l.labelQuestion;
      case "render_images":
        return l.labelImages;
      case "render_html":
        return l.labelHtml;
      case "render_chart":
        return l.labelChart;
      case "refresh_ui":
        return l.labelRefresh;
      case "spawn_subagent":
        return l.labelSubagent;
      case "delegate_task":
        return l.labelDelegation;
      case "manage_delegations":
        return toolArgs?.action === "spawn" ? "subagente" : l.labelDelegation;
      case "exa_search":
        return l.labelExaSearch;
      case "web_fetch":
        return l.labelWebFetch;
      case "memory_recall":
      case "memory_store":
      case "memory_forget":
        return l.labelMemory;
      case "manage_custom_tools":
        return l.labelManageCustomTools;
      default:
        return name;
    }
  };

  const labelText = meta.label === toolName ? getToolLabel(toolName, args) : meta.label;

  const running = result === null;
  const activeResult =
    result ||
    (partialResult
      ? {
          toolName,
          content: [
            {
              type: "text",
              text:
                typeof partialResult === "string"
                  ? partialResult
                  : partialResult.output || partialResult.text || JSON.stringify(partialResult),
            },
          ],
          isError: false,
          details: partialResult.details || partialResult,
        }
      : null);
  const hasError = result?.isError ?? false;
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
        onClick={() => !disabled && setExpanded(!expanded)}
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

      {(!running || isInteractive || partialResult !== null) && expanded && (
        <div className={`border-t border-border bg-card-hover/20 ${isFullBleed ? "p-0" : "p-3"}`}>
          <ToolBody
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
