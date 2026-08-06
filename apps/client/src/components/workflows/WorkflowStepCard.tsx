// SPDX-License-Identifier: MIT
import { AlertTriangle, Bot, CheckCircle, Clock, Trash2 } from "lucide-react";
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
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`group relative p-4 rounded-xl border border-l-4 border-l-blue-500 transition-all cursor-pointer bg-card/80 backdrop-blur shadow-sm ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-border hover:border-border/80 hover:bg-accent/40"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-accent/80 border border-border">
            <Bot className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{step.label}</h4>
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

      {step.taskTemplate && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic font-sans bg-accent/30 p-2 rounded border border-border/30">
          "{step.taskTemplate}"
        </p>
      )}
    </div>
  );
};
