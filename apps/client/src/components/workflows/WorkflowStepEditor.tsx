import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { Pin, Trash2, X } from "lucide-react";
import React, { useState } from "react";
import type { WorkflowDefinition, WorkflowStep, WorkflowStepType } from "shared";
import { AgentStepForm } from "./editors/AgentStepForm";
import { ApprovalStepForm } from "./editors/ApprovalStepForm";
import { CodeStepForm } from "./editors/CodeStepForm";
import { ControlStepForm } from "./editors/ControlStepForm";
import { HttpStepForm } from "./editors/HttpStepForm";
import { LlmStepForm } from "./editors/LlmStepForm";
import { WorkflowVariablePicker } from "./WorkflowVariablePicker";

interface WorkflowStepEditorProps {
  step: WorkflowStep;
  workflow: WorkflowDefinition;
  onUpdate: (updated: WorkflowStep) => void;
  onDelete: (stepId: string) => void;
  onClose: () => void;
}

const STEP_TYPE_OPTIONS: DropdownOption<WorkflowStepType>[] = [
  { value: "agent", label: "Agent Task" },
  { value: "llm", label: "LLM Call (Simple)" },
  { value: "if", label: "If Condition" },
  { value: "switch", label: "Switch Branch" },
  { value: "merge", label: "Merge Flow" },
  { value: "approval", label: "Human Approval" },
  { value: "code", label: "Code Node (JS)" },
  { value: "http", label: "HTTP Request" },
];

export const WorkflowStepEditor: React.FC<WorkflowStepEditorProps> = ({
  step,
  workflow,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const [activeField, setActiveField] = useState<
    "taskTemplate" | "condition" | "codeSnippet" | "approvalMessage" | "httpUrl" | "httpBody" | "llmPrompt" | "llmSystemPrompt"
  >(
    step.type === "if" || step.type === "switch"
      ? "condition"
      : step.type === "code"
        ? "codeSnippet"
        : step.type === "approval"
          ? "approvalMessage"
          : step.type === "http"
            ? "httpUrl"
            : step.type === "llm"
              ? "llmPrompt"
              : "taskTemplate",
  );

  const availableDependsOn = workflow.steps.map((s) => s.id).filter((id) => id !== step.id);

  const toggleDependency = (depId: string) => {
    const current = step.dependsOn || [];
    const exists = current.includes(depId);
    const next = exists ? current.filter((id) => id !== depId) : [...current, depId];
    onUpdate({ ...step, dependsOn: next });
  };

  const handleTypeChange = (type: WorkflowStepType) => {
    onUpdate({
      ...step,
      type,
      codeSnippet: type === "code" && !step.codeSnippet ? "return { outputs: {} };" : step.codeSnippet,
      condition: (type === "if" || type === "switch") && !step.condition ? "$inputs.amount > 0" : step.condition,
      httpMethod: type === "http" && !step.httpMethod ? "GET" : step.httpMethod,
      llmPrompt: type === "llm" && !step.llmPrompt ? "Summarize the input text: {{ $inputs.text }}" : step.llmPrompt,
    });
  };

  const handleInsertVariable = (varExpr: string) => {
    if (activeField === "condition") {
      onUpdate({ ...step, condition: `${step.condition || ""} ${varExpr}`.trim() });
    } else if (activeField === "codeSnippet") {
      onUpdate({ ...step, codeSnippet: `${step.codeSnippet || ""} ${varExpr}`.trim() });
    } else if (activeField === "approvalMessage") {
      onUpdate({ ...step, approvalMessage: `${step.approvalMessage || ""} ${varExpr}`.trim() });
    } else if (activeField === "httpUrl") {
      onUpdate({ ...step, httpUrl: `${step.httpUrl || ""}${varExpr}`.trim() });
    } else if (activeField === "httpBody") {
      const current = typeof step.httpBody === "object" ? JSON.stringify(step.httpBody) : String(step.httpBody || "");
      onUpdate({ ...step, httpBody: `${current} ${varExpr}`.trim() });
    } else if (activeField === "llmPrompt") {
      onUpdate({ ...step, llmPrompt: `${step.llmPrompt || ""} ${varExpr}`.trim() });
    } else if (activeField === "llmSystemPrompt") {
      onUpdate({ ...step, llmSystemPrompt: `${step.llmSystemPrompt || ""} ${varExpr}`.trim() });
    } else {
      onUpdate({ ...step, taskTemplate: `${step.taskTemplate || ""} ${varExpr}`.trim() });
    }
  };

  const clearPinnedOutputs = () => {
    const next = { ...step };
    delete next.pinnedOutputs;
    onUpdate(next);
  };

  const renderFormContent = () => {
    switch (step.type) {
      case "agent":
        return <AgentStepForm step={step} onUpdate={onUpdate} onFocusField={setActiveField} />;
      case "llm":
        return <LlmStepForm step={step} onUpdate={onUpdate} onFocusField={setActiveField} />;
      case "if":
      case "switch":
      case "merge":
        return <ControlStepForm step={step} onUpdate={onUpdate} onFocusField={setActiveField} />;
      case "approval":
        return <ApprovalStepForm step={step} onUpdate={onUpdate} onFocusField={setActiveField} />;
      case "code":
        return <CodeStepForm step={step} onUpdate={onUpdate} onFocusField={setActiveField} />;
      case "http":
        return <HttpStepForm step={step} onUpdate={onUpdate} onFocusField={setActiveField} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 border-l border-border bg-card/90 backdrop-blur p-5 flex flex-col h-full overflow-y-auto select-none">
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Step Settings</h3>
          <p className="text-[11px] font-mono text-muted-foreground">{step.id}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Step Label</label>
          <input
            type="text"
            value={step.label}
            onChange={(e) => onUpdate({ ...step, label: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Step Type</label>
          <Dropdown
            value={step.type}
            onChange={handleTypeChange}
            options={STEP_TYPE_OPTIONS}
            matchWidth
            className="w-full"
          />
        </div>

        <WorkflowVariablePicker
          workflow={workflow}
          currentStepId={step.id}
          onInsertVariable={handleInsertVariable}
          format={step.type === "if" || step.type === "switch" || step.type === "code" ? "raw" : "mustache"}
        />

        {renderFormContent()}

        {step.pinnedOutputs && (
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                <Pin className="w-3 h-3" /> Pinned Outputs
              </span>
              <button
                onClick={clearPinnedOutputs}
                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
              >
                Clear Pin
              </button>
            </div>
            <pre className="text-[10px] font-mono text-amber-200/80 bg-background/50 p-2 rounded max-h-24 overflow-y-auto">
              {JSON.stringify(step.pinnedOutputs, null, 2)}
            </pre>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Dependencies (dependsOn)
          </label>
          <div className="space-y-1.5">
            {availableDependsOn.map((depId) => {
              const isChecked = step.dependsOn?.includes(depId) || false;
              return (
                <label
                  key={depId}
                  className="flex items-center gap-2 p-2 rounded-lg bg-accent/30 border border-border/50 cursor-pointer text-xs text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleDependency(depId)}
                    className="rounded border-border bg-background text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="font-mono">{depId}</span>
                </label>
              );
            })}
            {availableDependsOn.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No other steps to depend on.</p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border mt-4">
        <button
          onClick={() => onDelete(step.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs border border-destructive/20 transition font-medium cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Step
        </button>
      </div>
    </div>
  );
};
