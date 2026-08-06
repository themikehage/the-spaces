// SPDX-License-Identifier: MIT
import { ChevronDown, ChevronRight, Copy, Variable } from "lucide-react";
import React, { useState } from "react";
import type { WorkflowDefinition } from "shared";

interface WorkflowVariablePickerProps {
  workflow: WorkflowDefinition;
  currentStepId: string;
  onInsertVariable: (varExpr: string) => void;
  format?: "mustache" | "raw";
}

export const WorkflowVariablePicker: React.FC<WorkflowVariablePickerProps> = ({
  workflow,
  currentStepId,
  onInsertVariable,
  format = "mustache",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const inputKeys = workflow.inputs ? Object.keys(workflow.inputs) : ["message"];

  const stepIndex = workflow.steps.findIndex((s) => s.id === currentStepId);
  const precedingSteps = stepIndex > 0 ? workflow.steps.slice(0, stepIndex) : [];

  const formatVar = (path: string) => {
    return format === "mustache" ? `{{ ${path} }}` : path;
  };

  const getStepOutputs = (step: (typeof workflow.steps)[0]): string[] => {
    const outputs = new Set<string>();
    if (step.type === "agent") {
      outputs.add("result");
      outputs.add("executive_summary");
    } else if (step.type === "if" || step.type === "switch") {
      outputs.add("activeBranch");
      outputs.add("conditionResult");
    } else if (step.type === "approval") {
      outputs.add("approved");
    } else if (step.type === "merge") {
      outputs.add("merged");
    }

    if (step.captureOutputs) {
      step.captureOutputs.forEach((k) => outputs.add(k));
    }
    if (step.pinnedOutputs) {
      Object.keys(step.pinnedOutputs).forEach((k) => outputs.add(k));
    }
    return Array.from(outputs);
  };

  return (
    <div className="border border-border/60 rounded-xl bg-accent/20 overflow-hidden text-xs my-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 bg-accent/40 hover:bg-accent/60 text-muted-foreground hover:text-foreground font-medium transition cursor-pointer select-none"
      >
        <span className="flex items-center gap-1.5 font-semibold text-primary">
          <Variable className="w-3.5 h-3.5" />
          <span>Available Scope Variables</span>
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="p-3 space-y-3 bg-card/60 backdrop-blur max-h-48 overflow-y-auto border-t border-border/40 font-mono text-[11px]">
          {/* Inputs section */}
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-sans font-bold block mb-1">
              $inputs
            </span>
            <div className="flex flex-wrap gap-1">
              {inputKeys.map((key) => {
                const expr = formatVar(`$inputs.${key}`);
                return (
                  <button
                    key={key}
                    onClick={() => onInsertVariable(expr)}
                    className="px-2 py-1 rounded bg-blue-950/40 text-blue-300 border border-blue-800/40 hover:bg-blue-900/60 transition flex items-center gap-1 cursor-pointer"
                    title={`Click to insert ${expr}`}
                  >
                    <Copy className="w-2.5 h-2.5" />
                    <span>$inputs.{key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preceding steps section */}
          {precedingSteps.map((step) => {
            const outputs = getStepOutputs(step);
            return (
              <div key={step.id} className="pt-2 border-t border-border/30">
                <span className="text-[10px] text-purple-300 uppercase font-sans font-bold block mb-1">
                  $steps.{step.id} ({step.label})
                </span>
                <div className="flex flex-wrap gap-1">
                  {outputs.map((outKey) => {
                    const expr = formatVar(`$steps.${step.id}.outputs.${outKey}`);
                    return (
                      <button
                        key={outKey}
                        onClick={() => onInsertVariable(expr)}
                        className="px-2 py-1 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40 hover:bg-purple-900/60 transition flex items-center gap-1 cursor-pointer"
                        title={`Click to insert ${expr}`}
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>outputs.{outKey}</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => onInsertVariable(formatVar(`$steps.${step.id}.status`))}
                    className="px-2 py-1 rounded bg-zinc-900/50 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-800 transition flex items-center gap-1 cursor-pointer"
                    title="Insert status variable"
                  >
                    <Copy className="w-2.5 h-2.5" />
                    <span>status</span>
                  </button>
                </div>
              </div>
            );
          })}

          {precedingSteps.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic font-sans">
              No preceding steps yet. Add steps before this one to access step outputs.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
