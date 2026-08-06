// SPDX-License-Identifier: MIT
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Clock,
  Code2,
  GitFork,
  GitMerge,
  Pin,
  ShieldAlert,
  Slash,
  Trash2,
} from "lucide-react";
import React from "react";
import type { WorkflowStep, WorkflowStepState } from "shared";

interface WorkflowStepCardProps {
  step: WorkflowStep;
  isSelected: boolean;
  stepState?: WorkflowStepState;
  onSelect: () => void;
  onDelete: () => void;
}

export const WorkflowStepCard: React.FC<WorkflowStepCardProps> = ({
  step,
  isSelected,
  stepState,
  onSelect,
  onDelete,
}) => {
  const renderStepIcon = () => {
    switch (step.type) {
      case "if":
      case "switch":
        return <GitFork className="w-4 h-4 text-purple-400" />;
      case "merge":
        return <GitMerge className="w-4 h-4 text-cyan-400" />;
      case "approval":
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      case "code":
        return <Code2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bot className="w-4 h-4 text-blue-400" />;
    }
  };

  const renderStatusBadge = () => {
    if (!stepState) return null;
    switch (stepState.status) {
      case "running":
        return (
          <span className="flex items-center gap-1 text-[11px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40 animate-pulse">
            <Clock className="w-3 h-3 animate-spin" /> Running
          </span>
        );
      case "success":
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
            <CheckCircle className="w-3 h-3" /> Done
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
            <AlertTriangle className="w-3 h-3" /> Error
          </span>
        );
      case "skipped":
        return (
          <span className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800/40">
            <Slash className="w-3 h-3" /> Skipped
          </span>
        );
      case "pinned":
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
            <Pin className="w-3 h-3" /> Pinned
          </span>
        );
      case "waiting_approval":
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 animate-pulse">
            <ShieldAlert className="w-3 h-3" /> Needs Approval
          </span>
        );
      default:
        return null;
    }
  };

  const getBorderColor = () => {
    switch (step.type) {
      case "if":
      case "switch":
        return "border-l-purple-500";
      case "merge":
        return "border-l-cyan-500";
      case "approval":
        return "border-l-amber-500";
      case "code":
        return "border-l-emerald-500";
      default:
        return "border-l-blue-500";
    }
  };

  const isSkipped = stepState?.status === "skipped";

  return (
    <div
      onClick={onSelect}
      className={`group relative p-4 rounded-xl border border-l-4 ${getBorderColor()} transition-all cursor-pointer bg-card/80 backdrop-blur shadow-sm ${
        isSkipped ? "opacity-40 grayscale" : ""
      } ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-border hover:border-border/80 hover:bg-accent/40"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-accent/80 border border-border">
            {renderStepIcon()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold text-foreground">{step.label}</h4>
              {step.pinnedOutputs && (
                <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                  <Pin className="w-2.5 h-2.5" /> Pinned
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono">
              {step.type} • {step.id}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {renderStatusBadge()}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition opacity-0 group-hover:opacity-100"
            title="Delete Step"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {step.dependsOn && step.dependsOn.length > 0 && (
        <div className="mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="text-[11px]">Depends on:</span>
          <div className="flex flex-wrap gap-1 font-mono text-[11px]">
            {step.dependsOn.map((dep) => (
              <span
                key={dep}
                className="px-1.5 py-0.5 rounded bg-accent/80 text-foreground border border-border/50"
              >
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {step.condition && (
        <div className="mt-2 text-xs font-mono text-purple-300 bg-purple-950/30 p-2 rounded border border-purple-800/30">
          Condition: {step.condition}
        </div>
      )}

      {step.codeSnippet && (
        <div className="mt-2 text-xs font-mono text-emerald-300 bg-emerald-950/30 p-2 rounded border border-emerald-800/30 line-clamp-2">
          {step.codeSnippet}
        </div>
      )}

      {step.taskTemplate && step.type === "agent" && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic font-sans bg-accent/30 p-2 rounded border border-border/30">
          "{step.taskTemplate}"
        </p>
      )}
    </div>
  );
};
