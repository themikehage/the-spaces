// SPDX-License-Identifier: MIT
import { Modal } from "@/components/ui/Modal";
import { useLiterals } from "@/lib";
import { useState } from "react";
import { literals as u } from "./ToolsSelector.literals";
import { ChevronDown, Shield } from "lucide-react";

export interface ToolDefinition {
  id: string;
  name: string;
  desc: string;
  gateKey?: string;
}

export const ALL_TOOLS: ToolDefinition[] = [
  { id: "read", name: "Read File", desc: "Read content of files on disk" },
  { id: "write", name: "Write File", desc: "Create new files on disk" },
  { id: "edit", name: "Edit File", desc: "Modify existing files on disk" },
  { id: "bash", name: "Bash Command", desc: "Execute shell commands on host" },
  { id: "grep", name: "Grep Search", desc: "Find pattern matches within files" },
  { id: "find", name: "Find Files", desc: "Locate files in directory structure" },
  { id: "ls", name: "Directory List", desc: "List directory contents" },
  {
    id: "request_approval",
    name: "Request Approval",
    desc: "Require explicit authorization for critical actions",
  },
  {
    id: "ask_question",
    name: "Ask Question",
    desc: "Ask single/multi-choice or custom text questions",
  },
  {
    id: "render_images",
    name: "Render Images",
    desc: "Display a responsive grid of generated drawings/images",
  },
  {
    id: "render_chart",
    name: "Render Charts",
    desc: "Visualize metrics via line/bar/pie/area charts",
  },
  { id: "render_html", name: "Render HTML", desc: "Render interactive HTML documents in the chat" },
  {
    id: "share_file",
    name: "Share File",
    desc: "Share downloadable files with the user (PDF, DOC, XLSX, ZIP, etc.)",
  },
  {
    id: "refresh_ui",
    name: "Refresh UI",
    desc: "Notify the interface to reload sidebars and lists after changes",
  },
  {
    id: "spawn_subagent",
    name: "Spawn Subagent",
    desc: "Delegate a task to a fresh subagent with isolated context",
  },
  {
    id: "delegate_task",
    name: "Delegate Task",
    desc: "Delegate task to another agent, project, channel, or session",
  },
  {
    id: "exa_search",
    name: "Exa Search",
    desc: "Search the web using Exa AI (semantic search engine)",
    gateKey: "EXA_API_KEY",
  },
  {
    id: "web_fetch",
    name: "Web Fetch",
    desc: "Fetch and extract content from any URL as clean Markdown",
  },
];

interface Props {
  activeTools: string[];
  onChange: (tools: string[], executionMode?: "readonly" | "standard" | "autonomous") => void;
  disabled?: boolean;
  toolStatus?: Record<string, "available" | "missing_key">;
  executionMode?: "readonly" | "standard" | "autonomous";
}

export function ToolsSelector({
  activeTools,
  onChange,
  disabled = false,
  toolStatus,
  executionMode,
}: Props) {
  const l = useLiterals(u);
  const [open, setOpen] = useState(false);

  const handleToggleTool = (toolId: string) => {
    let next: string[];
    if (activeTools.includes(toolId)) {
      next = activeTools.filter((t) => t !== toolId);
    } else {
      next = [...activeTools, toolId];
    }
    onChange(next, executionMode);
  };

  const applyPreset = (preset: "autonomous" | "standard" | "readonly") => {
    if (preset === "autonomous") {
      const available = ALL_TOOLS.filter(
        (t) => !(t.gateKey && toolStatus?.[t.id] === "missing_key"),
      ).map((t) => t.id);
      onChange(available, "autonomous");
    } else if (preset === "standard") {
      const standardTools = [
        "read",
        "write",
        "edit",
        "bash",
        "grep",
        "find",
        "ls",
        "request_approval",
        "ask_question",
        "render_html",
      ];
      onChange(standardTools, "standard");
    } else {
      onChange(["read", "grep", "find", "ls"], "readonly");
    }
  };

  const isReadOnly =
    executionMode === "readonly" ||
    (activeTools.includes("read") &&
      activeTools.includes("grep") &&
      activeTools.includes("find") &&
      activeTools.includes("ls") &&
      !activeTools.includes("write") &&
      !activeTools.includes("edit") &&
      !activeTools.includes("bash"));

  const isAutonomous = executionMode === "autonomous";
  const isStandard = executionMode === "standard" || (!isReadOnly && !isAutonomous);

  let statusLabel = `${activeTools.length}/${ALL_TOOLS.length} tools`;
  if (isAutonomous)
    statusLabel = l.fullAccess; // displays Autonomous
  else if (isStandard) statusLabel = l.standard || "Standard";
  else if (isReadOnly) statusLabel = l.readOnly;
  else if (activeTools.length === 0) statusLabel = l.restricted;

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 cursor-pointer ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <Shield size={12} />
        <span>Sandbox: {statusLabel}</span>
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Allowed Tools">
        <div className="p-2 bg-card">
          <div className="px-1.5 pb-2 flex gap-2 border-b border-input mb-2">
            <button
              onClick={() => applyPreset("autonomous")}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer text-xs ${
                isAutonomous
                  ? "bg-primary/20 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground bg-card-hover"
              }`}
            >
              {l.fullAccess}
            </button>
            <button
              onClick={() => applyPreset("standard")}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer text-xs ${
                isStandard
                  ? "bg-primary/20 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground bg-card-hover"
              }`}
            >
              {l.standard || "Standard"}
            </button>
            <button
              onClick={() => applyPreset("readonly")}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer text-xs ${
                isReadOnly
                  ? "bg-primary/20 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground bg-card-hover"
              }`}
            >
              {l.readOnly}
            </button>
          </div>
          <div className="space-y-2">
            {ALL_TOOLS.map((t) => {
              const isGated = !!(t.gateKey && toolStatus?.[t.id] === "missing_key");
              const checked = activeTools.includes(t.id);
              const isToolDisabled = disabled || isGated;

              return (
                <label
                  key={t.id}
                  className={`flex items-start gap-2.5 p-1.5 rounded-md transition-colors ${
                    isToolDisabled
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-card-hover/50 cursor-pointer"
                  }`}
                  title={isGated ? `Requires ${t.gateKey} in Settings > Env Vars` : undefined}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isToolDisabled}
                    onChange={() => !isToolDisabled && handleToggleTool(t.id)}
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <div className="font-semibold text-foreground font-mono text-xs flex items-center gap-1.5">
                      {t.id}
                      {isGated && (
                        <span className="px-1 py-0.2 bg-warning/10 text-warning text-[8px] font-semibold rounded">
                          Gated
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs leading-snug">
                      {t.desc}
                      {isGated && (
                        <span className="block text-warning text-[8px] mt-0.5 font-medium">
                          Requires {t.gateKey}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
