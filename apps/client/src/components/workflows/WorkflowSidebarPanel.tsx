// SPDX-License-Identifier: MIT
import { ChevronDown, ChevronRight, GitBranch, History, Plus } from "lucide-react";
import React, { useState } from "react";
import type { WorkflowDefinition, WorkflowRun } from "shared";

interface WorkflowSidebarPanelProps {
  workflows: WorkflowDefinition[];
  selectedWorkflow: WorkflowDefinition | null;
  runHistory: WorkflowRun[];
  activeRun: WorkflowRun | null;
  onSelectWorkflow: (wf: WorkflowDefinition) => void;
  onCreateWorkflow: () => void;
  onSelectRun: (run: WorkflowRun) => void;
}

export const WorkflowSidebarPanel: React.FC<WorkflowSidebarPanelProps> = ({
  workflows,
  selectedWorkflow,
  runHistory,
  activeRun,
  onSelectWorkflow,
  onCreateWorkflow,
  onSelectRun,
}) => {
  const [historyOpen, setHistoryOpen] = useState(true);

  return (
    <div className="w-64 border-r border-border bg-card/40 flex flex-col h-full flex-shrink-0 select-none">
      {/* Header / Create button */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground font-semibold text-xs uppercase tracking-wider">
          <GitBranch size={14} className="text-primary" />
          <span>Workflows</span>
        </div>
        <button
          onClick={onCreateWorkflow}
          className="p-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs flex items-center gap-1 transition"
          title="New Workflow"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Workflows List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
          Definitions ({workflows.length})
        </div>

        {workflows.map((wf) => {
          const isSelected = selectedWorkflow?.id === wf.id;
          return (
            <button
              key={wf.id}
              onClick={() => onSelectWorkflow(wf)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex flex-col gap-0.5 ${
                isSelected
                  ? "bg-primary/15 text-primary font-medium border border-primary/20"
                  : "text-foreground hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="truncate">{wf.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-accent/60 px-1.5 py-0.2 rounded">
                  {wf.steps.length} {wf.steps.length === 1 ? "step" : "steps"}
                </span>
              </div>
              {wf.description && (
                <p className="text-[11px] text-muted-foreground truncate">{wf.description}</p>
              )}
            </button>
          );
        })}

        {workflows.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground italic">
            No workflows yet. Click "+" to create one.
          </div>
        )}
      </div>

      {/* Execution History Accordion */}
      {selectedWorkflow && (
        <div className="border-t border-border bg-card/20 flex flex-col max-h-56">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="p-2.5 px-3 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <div className="flex items-center gap-1.5">
              <History size={13} />
              <span>Execution History</span>
              {runHistory.length > 0 && (
                <span className="text-[10px] font-mono bg-accent px-1.5 py-0.2 rounded">
                  {runHistory.length}
                </span>
              )}
            </div>
            {historyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {historyOpen && (
            <div className="overflow-y-auto p-2 pt-0 space-y-1">
              {runHistory.map((run) => {
                const isActive = activeRun?.id === run.id;
                return (
                  <button
                    key={run.id}
                    onClick={() => onSelectRun(run)}
                    className={`w-full text-left p-2 rounded-md border text-xs transition flex items-center justify-between ${
                      isActive
                        ? "bg-accent/80 border-primary/40 text-foreground"
                        : "bg-card/40 border-border/60 hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div>
                      <div className="font-mono text-[11px] flex items-center gap-1">
                        <span>#{run.id.slice(0, 6)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(run.startedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                        run.status === "success"
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                          : run.status === "error"
                            ? "bg-rose-950/40 text-rose-400 border-rose-800/40"
                            : run.status === "running"
                              ? "bg-blue-950/40 text-blue-400 border-blue-800/40 animate-pulse"
                              : "bg-amber-950/40 text-amber-400 border-amber-800/40"
                      }`}
                    >
                      {run.status}
                    </span>
                  </button>
                );
              })}

              {runHistory.length === 0 && (
                <div className="text-[11px] text-muted-foreground italic text-center py-3">
                  No runs recorded.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
