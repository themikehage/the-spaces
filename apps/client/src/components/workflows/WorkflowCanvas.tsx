// SPDX-License-Identifier: MIT
import {
  ArrowDown,
  Bot,
  Code2,
  GitFork,
  GitMerge,
  Plus,
  ShieldAlert,
} from "lucide-react";
import React, { useState } from "react";
import type { WorkflowDefinition, WorkflowRun, WorkflowStep, WorkflowStepType } from "shared";
import { WorkflowStepCard } from "./WorkflowStepCard";

interface WorkflowCanvasProps {
  workflow: WorkflowDefinition;
  selectedStep: WorkflowStep | null;
  activeRun?: WorkflowRun | null;
  onSelectStep: (step: WorkflowStep) => void;
  onAddStep: (type: WorkflowStepType) => void;
  onDeleteStep: (stepId: string) => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  selectedStep,
  activeRun,
  onSelectStep,
  onAddStep,
  onDeleteStep,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const stepTypes: { type: WorkflowStepType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: "agent", label: "Agent Task", icon: <Bot className="w-3.5 h-3.5" />, color: "hover:bg-blue-950/40 hover:text-blue-400" },
    { type: "if", label: "If Condition", icon: <GitFork className="w-3.5 h-3.5" />, color: "hover:bg-purple-950/40 hover:text-purple-400" },
    { type: "switch", label: "Switch Branch", icon: <GitFork className="w-3.5 h-3.5 text-purple-300" />, color: "hover:bg-purple-950/40 hover:text-purple-300" },
    { type: "merge", label: "Merge Flow", icon: <GitMerge className="w-3.5 h-3.5" />, color: "hover:bg-cyan-950/40 hover:text-cyan-400" },
    { type: "approval", label: "Human Approval", icon: <ShieldAlert className="w-3.5 h-3.5" />, color: "hover:bg-amber-950/40 hover:text-amber-400" },
    { type: "code", label: "Code Node (JS)", icon: <Code2 className="w-3.5 h-3.5" />, color: "hover:bg-emerald-950/40 hover:text-emerald-400" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-background p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center">
        {workflow.steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="w-full">
              <WorkflowStepCard
                step={step}
                isSelected={selectedStep?.id === step.id}
                stepState={activeRun?.stepStates?.[step.id]}
                onSelect={() => onSelectStep(step)}
                onDelete={() => onDeleteStep(step.id)}
              />
            </div>

            {index < workflow.steps.length - 1 && (
              <div className="flex flex-col items-center my-2">
                <div className="w-0.5 h-6 bg-border" />
                <div className="p-1 rounded-full bg-accent border border-border text-muted-foreground -mt-1">
                  <ArrowDown className="w-3 h-3" />
                </div>
              </div>
            )}
          </React.Fragment>
        ))}

        {/* Add Step Selector */}
        <div className="relative flex flex-col items-center mt-4">
          {workflow.steps.length > 0 && <div className="w-0.5 h-6 bg-border mb-2" />}

          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Step
            </button>

            {showAddMenu && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-48 py-1 rounded-xl bg-card border border-border shadow-xl z-20 backdrop-blur">
                {stepTypes.map((st) => (
                  <button
                    key={st.type}
                    onClick={() => {
                      onAddStep(st.type);
                      setShowAddMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground ${st.color} transition text-left cursor-pointer`}
                  >
                    {st.icon}
                    <span className="font-medium">{st.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {workflow.steps.length === 0 && (
          <div className="w-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl text-center mt-8">
            <p className="text-muted-foreground text-sm mb-4">
              No steps added to this workflow yet.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {stepTypes.map((st) => (
                <button
                  key={st.type}
                  onClick={() => onAddStep(st.type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/80 text-foreground text-xs font-medium rounded-xl border border-border transition cursor-pointer"
                >
                  {st.icon}
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
