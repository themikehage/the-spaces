// SPDX-License-Identifier: MIT
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, History, XCircle } from "lucide-react";
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

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-background">
      {/* Left Column: Executions List */}
      <div className="w-full md:w-80 border-r border-border bg-card/20 flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <History className="w-4 h-4 text-primary" />
            <span>Execution History</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
            {runHistory.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {runHistory.map((run) => {
            const isSelected = displayedRun?.id === run.id;
            const stepCount = Object.keys(run.stepStates || {}).length;
            return (
              <div
                key={run.id}
                onClick={() => {
                  setSelectedRunId(run.id);
                  onSelectRun(run);
                }}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? "bg-primary/10 border-primary/40 text-foreground shadow-sm"
                    : "bg-card/40 border-border/60 hover:bg-card hover:border-border text-muted-foreground"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-foreground">
                      #{run.id.slice(0, 8)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(run.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {stepCount} {stepCount === 1 ? "step" : "steps"} executed
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${
                      run.status === "success"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : run.status === "error"
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : run.status === "running"
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }`}
                  >
                    {run.status === "success" && <CheckCircle2 className="w-3 h-3" />}
                    {run.status === "error" && <XCircle className="w-3 h-3" />}
                    {run.status === "running" && <Clock className="w-3 h-3" />}
                    {run.status === "waiting_approval" && <AlertTriangle className="w-3 h-3" />}
                    <span>{run.status}</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
              </div>
            );
          })}

          {runHistory.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground italic">
              No executions recorded yet. Run this workflow in the Playground tab to create an
              execution.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Execution Details */}
      <div className="flex-1 overflow-y-auto p-6 bg-background/50 flex flex-col">
        {displayedRun ? (
          <div className="max-w-4xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Execution Details: #{displayedRun.id}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Started at {new Date(displayedRun.startedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Inputs Payload summary */}
            {displayedRun.inputs && Object.keys(displayedRun.inputs).length > 0 && (
              <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Inputs Payload
                </div>
                <pre className="text-xs font-mono bg-accent/40 p-2.5 rounded-lg text-foreground overflow-x-auto">
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
            <p className="text-xs">
              Select an execution from the list to view step outputs and logs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
