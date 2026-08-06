// SPDX-License-Identifier: MIT
import { ArrowDown, Plus } from "lucide-react";
import React from "react";
import type { WorkflowDefinition, WorkflowRun, WorkflowStep } from "shared";
import { WorkflowStepCard } from "./WorkflowStepCard";

interface WorkflowCanvasProps {
  workflow: WorkflowDefinition;
  selectedStep: WorkflowStep | null;
  activeRun?: WorkflowRun | null;
  onSelectStep: (step: WorkflowStep) => void;
  onAddStep: (type: WorkflowStep["type"]) => void;
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

  return (
    <div className="flex-1 flex flex-col h-full bg-background p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center">
        {workflow.steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step Card */}
            <div className="w-full">
              <WorkflowStepCard
                step={step}
                isSelected={selectedStep?.id === step.id}
                stepState={activeRun?.stepStates?.[step.id]}
                onSelect={() => onSelectStep(step)}
                onDelete={() => onDeleteStep(step.id)}
              />
            </div>

            {/* Visual Flow Connector */}
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

        {/* Add Step Button */}
        <div className="relative flex flex-col items-center mt-4">
          {workflow.steps.length > 0 && <div className="w-0.5 h-6 bg-border mb-2" />}

          <button
            onClick={() => onAddStep("agent")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Add Step
          </button>
        </div>

        {workflow.steps.length === 0 && (
          <div className="w-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl text-center mt-8">
            <p className="text-muted-foreground text-sm mb-4">
              No steps added to this workflow yet.
            </p>
            <button
              onClick={() => onAddStep("agent")}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition shadow-sm"
            >
              Create First Step
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
