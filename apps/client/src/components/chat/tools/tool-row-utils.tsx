// SPDX-License-Identifier: MIT
import { toSafeString } from "@/lib";
import {
  AlertCircle,
  Database,
  Eye,
  FileText,
  Folder,
  Globe,
  Image,
  Layers,
  List,
  Monitor,
  PanelLeft,
  Pencil,
  PieChart,
  RefreshCw,
  Search,
  SearchX,
  Terminal,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { TOOL_DISPLAY_META, isKnownTool, type ToolName } from "shared";
import type { ToolResultData } from "./ToolCallRow";

const TOOL_ICONS: Record<string, React.ReactNode> = {
  ls: <Folder size={13} />,
  find: <Search size={13} strokeWidth={2.5} />,
  write: <Pencil size={13} />,
  read: <Eye size={13} />,
  edit: <FileText size={13} />,
  grep: <SearchX size={13} strokeWidth={2.5} />,
  bash: <Terminal size={13} />,
  request_approval: <AlertCircle size={13} />,
  ask_question: <AlertCircle size={13} />,
  render_images: <Image size={13} />,
  render_html: <List size={13} />,
  render_chart: <PieChart size={13} />,
  refresh_ui: <RefreshCw size={13} />,
  spawn_subagent: <PanelLeft size={13} strokeWidth={2.5} />,
  delegate_task: <Users size={13} strokeWidth={2.5} />,
  manage_delegations: <UserCheck size={13} strokeWidth={2.5} />,
  exa_search: <Search size={13} strokeWidth={2.5} />,
  web_fetch: <Globe size={13} strokeWidth={2.5} />,
  task: <List size={13} strokeWidth={2.5} />,
  memory: <Database size={13} strokeWidth={2.5} />,
  memory_store: <Database size={13} strokeWidth={2.5} />,
  memory_recall: <Search size={13} strokeWidth={2.5} />,
  memory_forget: <Trash2 size={13} strokeWidth={2.5} />,
  decompose_tasks: <List size={13} strokeWidth={2.5} />,
  manage_custom_tools: <Layers size={13} strokeWidth={2.5} />,
  manage_preview: <Monitor size={13} strokeWidth={2.5} />,
};

export const TOOL_META: Record<
  string,
  { label: string; colorClass: string; icon: React.ReactNode }
> = new Proxy(
  {},
  {
    get(_target, prop: string) {
      const display = isKnownTool(prop) ? TOOL_DISPLAY_META[prop as ToolName] : undefined;
      return {
        label: display?.label ?? prop,
        colorClass: display?.colorClass ?? "text-primary",
        icon: TOOL_ICONS[prop],
      };
    },
  },
);

export function getArgSummary(
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
    case "memory": {
      const action = toSafeString(args.action, "read");
      if (action === "read") {
        const q = toSafeString(args.query);
        return q.length > 60 ? q.slice(0, 60) + "…" : q;
      }
      if (action === "upsert") {
        const c = toSafeString(args.content);
        return c.length > 50 ? c.slice(0, 50) + "…" : c;
      }
      if (action === "delete") return toSafeString(args.id);
      return action;
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
    case "task": {
      const action = toSafeString(args.action, "start");
      if (action === "start") {
        const obj = toSafeString(args.objective);
        return obj.length > 50 ? obj.slice(0, 50) + "…" : obj;
      }
      if (action === "update") {
        return `${toSafeString(args.taskId)} → ${toSafeString(args.status)}`;
      }
      if (action === "end") return toSafeString(args.summary);
      return action;
    }
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

export function getResultSummary(
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
    case "memory": {
      const action = toSafeString(args.action, "read");
      if (action === "read") {
        const n = result.details?.count ?? 0;
        return `${n} ${n !== 1 ? l.resMemories : l.resMemory}`;
      }
      if (action === "upsert") return l.resStored;
      if (action === "delete") return l.resForgotten;
      return "done";
    }
    case "memory_recall": {
      const n = result.details?.count ?? 0;
      return `${n} ${n !== 1 ? l.resMemories : l.resMemory}`;
    }
    case "memory_store":
      return l.resStored;
    case "memory_forget":
      return l.resForgotten;
    case "task": {
      const action = toSafeString(args.action, "start");
      if (action === "start") return l.resDecomposed;
      return "done";
    }
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

export function getToolLabel(
  name: string,
  l: Record<string, string>,
  toolArgs?: Record<string, unknown>,
): string {
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
    case "memory":
    case "memory_recall":
    case "memory_store":
    case "memory_forget":
      return l.labelMemory;
    case "task":
    case "decompose_tasks":
      return "task";
    case "manage_custom_tools":
      return l.labelManageCustomTools;
    default:
      return name;
  }
}

export function isCustomToolCheck(toolName: string): boolean {
  return !isKnownTool(toolName) && !toolName.startsWith("mcp_");
}
