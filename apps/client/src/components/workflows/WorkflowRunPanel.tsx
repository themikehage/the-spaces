// SPDX-License-Identifier: MIT
import { AlertCircle, CheckCircle2, Clock, Pin, ShieldAlert, Slash, StopCircle } from "lucide-react";
import React from "react";
import type { WorkflowDefinition, WorkflowRun } from "shared";
import { WorkflowApprovalBanner } from "./WorkflowApprovalBanner";
import { WorkflowStepChatStream } from "./WorkflowStepChatStream";

interface WorkflowRunPanelProps {
  run: WorkflowRun;
  workflow?: WorkflowDefinition | null;
  onAbort: (runId: string) => void;
  onResolveApproval?: (runId: string, stepId: string, approved: boolean) => Promise<void>;
}

export const WorkflowRunPanel: React.FC<WorkflowRunPanelProps> = ({
  run,
  workflow,
  onAbort,
  onResolveApproval,
}) => {
  const getStepLabel = (stepId: string) => {
    return workflow?.steps.find((s) => s.id === stepId)?.label || stepId;
  };

  const getApprovalMessage = (stepId: string) => {
    return workflow?.steps.find((s) => s.id === stepId)?.approvalMessage || `Approval required for step '${getStepLabel(stepId)}'`;
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
                  : run.status === "running" || run.status === "waiting_approval"
                    ? "bg-amber-950/40 text-amber-400 border-amber-800/40 animate-pulse"
                    : "bg-zinc-950/40 text-zinc-400 border-zinc-800/40"
            }`}
          >
            {run.status}
          </span>
        </div>
        {run.status === "running" && (
          <button
            onClick={() => onAbort(run.id)}
            className="flex items-center gap-1.5 text-xs text-destructive hover:bg-destructive/10 px-3 py-1 rounded-lg border border-destructive/20 transition font-medium cursor-pointer"
          >
            <StopCircle className="w-3.5 h-3.5" /> Abort Execution
          </button>
        )}
      </div>

      <div className="space-y-3">
        {Object.values(run.stepStates).map((stepState) => (
          <div
            key={stepState.stepId}
            className={`flex flex-col p-3.5 rounded-xl border text-xs gap-1.5 ${
              stepState.status === "skipped"
                ? "opacity-40 bg-zinc-950/20 border-zinc-900"
                : "bg-accent/30 border-border/50"
            }`}
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
                {stepState.status === "skipped" && (
                  <Slash className="w-3.5 h-3.5 text-zinc-500" />
                )}
                {stepState.status === "pinned" && (
                  <Pin className="w-3.5 h-3.5 text-amber-400" />
                )}
                {stepState.status === "waiting_approval" && (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                )}
                <span className="font-semibold text-foreground">
                  {getStepLabel(stepState.stepId)}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({stepState.stepId})
                </span>
              </div>
            </div>

            {stepState.status === "waiting_approval" && onResolveApproval && (
              <WorkflowApprovalBanner
                runId={run.id}
                stepId={stepState.stepId}
                message={getApprovalMessage(stepState.stepId)}
                onResolve={(approved) => onResolveApproval(run.id, stepState.stepId, approved)}
              />
            )}

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
