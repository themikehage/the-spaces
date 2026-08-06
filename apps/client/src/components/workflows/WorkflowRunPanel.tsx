// SPDX-License-Identifier: MIT
import { AlertCircle, CheckCircle2, Clock, StopCircle } from "lucide-react";
import React from "react";
import type { WorkflowDefinition, WorkflowRun } from "shared";
import { WorkflowStepChatStream } from "./WorkflowStepChatStream";

interface WorkflowRunPanelProps {
  run: WorkflowRun;
  workflow?: WorkflowDefinition | null;
  onAbort: (runId: string) => void;
}

export const WorkflowRunPanel: React.FC<WorkflowRunPanelProps> = ({
  run,
  workflow,
  onAbort,
}) => {
  const getStepLabel = (stepId: string) => {
    return workflow?.steps.find((s) => s.id === stepId)?.label || stepId;
  };

  return (
    <div className="bg-card/80 border border-border rounded-2xl p-4 mb-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-foreground">Run #{run.id.slice(0, 6)}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase border ${
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
        </div>
        {run.status === "running" && (
          <button
            onClick={() => onAbort(run.id)}
            className="flex items-center gap-1.5 text-xs text-destructive hover:bg-destructive/10 px-3 py-1 rounded-lg border border-destructive/20 transition font-medium"
          >
            <StopCircle className="w-3.5 h-3.5" /> Abort Execution
          </button>
        )}
      </div>

      <div className="space-y-3">
        {Object.values(run.stepStates).map((stepState) => (
          <div
            key={stepState.stepId}
            className="flex flex-col p-3.5 rounded-xl bg-accent/30 border border-border/50 text-xs gap-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stepState.status === "success" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {stepState.status === "running" && (
                  <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                )}
                {stepState.status === "error" && (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span className="font-semibold text-foreground">
                  {getStepLabel(stepState.stepId)}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({stepState.stepId})
                </span>
              </div>
            </div>

            {stepState.error && (
              <p className="text-[11px] text-rose-400 font-mono bg-rose-950/20 p-1.5 rounded border border-rose-900/30">
                {stepState.error}
              </p>
            )}

            {stepState.outputs && Object.keys(stepState.outputs).length > 0 && (
              <div className="mt-1 bg-background/50 p-2 rounded-lg border border-border/40 font-mono text-[11px] text-muted-foreground">
                <span className="font-sans font-semibold text-foreground text-[10px] uppercase block mb-1">
                  Outputs
                </span>
                <pre className="whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(stepState.outputs, null, 2)}
                </pre>
              </div>
            )}

            {stepState.agentSessionId && (
              <WorkflowStepChatStream
                agentSessionId={stepState.agentSessionId}
                status={stepState.status}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
