import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { HtmlPreview } from "../HtmlPreview";
import { ImageGrid } from "../ImageGrid";
import { ApprovalForm } from "./ApprovalForm";
import { AskQuestionForm } from "./AskQuestionForm";
import { BashResult } from "./BashResult";
import { ChartView } from "./ChartView";
import { DecomposeResult } from "./DecomposeResult";
import { EditResult } from "./EditResult";
import { ExaSearchResult } from "./ExaSearchResult";
import { FactoryResult } from "./FactoryResult";
import { FindResult } from "./FindResult";
import { GrepResult } from "./GrepResult";
import { LsResult } from "./LsResult";
import { MemoryResult } from "./MemoryResult";
import { ReadResult } from "./ReadResult";
import { ShareFileCard } from "./ShareFileCard";
import { SubagentLiveView } from "./SubagentLiveView";
import type { ToolResultData } from "./ToolCallRow";
import { unwrapToolContent } from "./tool-row-utils";
import { WebFetchResult } from "./WebFetchResult";
import { WorkflowResult } from "./WorkflowResult";
import { WriteResult } from "./WriteResult";
import { CustomToolBody } from "./custom";

interface ToolResultRouterProps {
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
}

export function ToolResultRouter({
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
}: ToolResultRouterProps) {
  const rawText = result?.content.find((b) => b.type === "text")?.text ?? "";
  const { text, json } = unwrapToolContent(rawText);

  switch (toolName) {
    case "manage_factory":
      return <FactoryResult args={args} text={text} json={json} />;
    case "manage_workflow":
      return <WorkflowResult args={args} text={text} json={json} />;
    case "task":
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
          args={args}
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
    case "memory": {
      const action = (args.action as string) || "read";
      const mode =
        action === "upsert" || action === "store"
          ? "upsert"
          : action === "delete" || action === "forget"
            ? "delete"
            : "read";
      return <MemoryResult mode={mode} args={args} details={result?.details} l={l} />;
    }
    case "memory_recall":
      return <MemoryResult mode="read" details={result?.details} l={l} />;
    case "memory_store":
      return <MemoryResult mode="upsert" args={args} details={result?.details} l={l} />;
    case "memory_forget":
      return <MemoryResult mode="delete" details={result?.details} l={l} />;
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
      const displayText = json ? JSON.stringify(json, null, 2) : text;
      return (
        <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-words bg-muted/60 p-3 rounded-md max-h-48 overflow-y-auto">
          {displayText}
        </pre>
      );
    }
  }
}
