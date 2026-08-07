// SPDX-License-Identifier: MIT
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { AlertTriangle, CheckCircle2, Clock, History, XCircle } from "lucide-react";
import React, { useState } from "react";
import type { WorkflowDefinition, WorkflowRun } from "shared";
import { WorkflowRunPanel } from "./WorkflowRunPanel";

interface WorkflowExecutionsTabProps {
  workflow: WorkflowDefinition;
  runHistory: WorkflowRun[];
  activeRun: WorkflowRun | null;
  onSelectRun: (run: WorkflowRun) => void;
  onAbortRun: (runId: string) => Promise<void>;
}

export const WorkflowExecutionsTab: React.FC<WorkflowExecutionsTabProps> = ({
  workflow,
  runHistory,
  activeRun,
  onSelectRun,
  onAbortRun,
}) => {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    activeRun?.id || (runHistory.length > 0 ? runHistory[0].id : null),
  );

  const displayedRun = runHistory.find((r) => r.id === selectedRunId) || activeRun;

  const executionOptions: DropdownOption<string>[] = runHistory.map((run) => {
    const stepCount = Object.keys(run.stepStates || {}).length;
    const time = new Date(run.startedAt).toLocaleTimeString();
    return {
      value: run.id,
      label: `#${run.id.slice(0, 8)} — ${time} (${run.status}, ${stepCount} steps)`,
    };
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Top Bar: Execution Selector Dropdown & Stats */}
      <div className="px-6 py-3 border-b border-border bg-card/20 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
            <History className="w-4 h-4 text-primary" />
            <span>Execution History</span>
          </div>

          {runHistory.length > 0 ? (
            <Dropdown<string>
              value={displayedRun?.id || ""}
              onChange={(val) => {
                const r = runHistory.find((item) => item.id === val);
                if (r) {
                  setSelectedRunId(r.id);
                  onSelectRun(r);
                }
              }}
              options={executionOptions}
              placeholder="Select execution..."
              size="sm"
            />
          ) : (
            <span className="text-xs text-muted-foreground italic">No executions recorded yet</span>
          )}
        </div>

        {displayedRun && (
          <div className="flex items-center gap-3 text-xs">
            <span
              className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1.5 ${
                displayedRun.status === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : displayedRun.status === "error"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : displayedRun.status === "running"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {displayedRun.status === "success" && <CheckCircle2 className="w-3 h-3" />}
              {displayedRun.status === "error" && <XCircle className="w-3 h-3" />}
              {displayedRun.status === "running" && <Clock className="w-3 h-3 animate-spin" />}
              {displayedRun.status === "waiting_approval" && <AlertTriangle className="w-3 h-3" />}
              <span>{displayedRun.status}</span>
            </span>
            <span className="font-mono text-muted-foreground">
              {new Date(displayedRun.startedAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Main Execution Body (Full Width) */}
      <div className="flex-1 overflow-y-auto p-6 bg-background/50 flex flex-col items-center">
        {displayedRun ? (
          <div className="max-w-4xl mx-auto w-full space-y-4">
            {/* Inputs Payload summary */}
            {displayedRun.inputs && Object.keys(displayedRun.inputs).length > 0 && (
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-2">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Inputs Payload
                </div>
                <pre className="text-xs font-mono bg-accent/40 p-3 rounded-xl text-foreground overflow-x-auto border border-border/40">
                  {JSON.stringify(displayedRun.inputs, null, 2)}
                </pre>
              </div>
            )}

            <WorkflowRunPanel
              run={displayedRun}
              workflow={workflow}
              onAbort={onAbortRun}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-8">
            <History className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs max-w-sm">
              No executions recorded yet. Run this workflow in the Playground tab to create an execution stream.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

