// SPDX-License-Identifier: MIT
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { Pin, Trash2, X } from "lucide-react";
import React, { useState } from "react";
import type { WorkflowDefinition, WorkflowStep, WorkflowStepType } from "shared";
import { WorkflowVariablePicker } from "./WorkflowVariablePicker";

interface WorkflowStepEditorProps {
  step: WorkflowStep;
  workflow: WorkflowDefinition;
  onUpdate: (updated: WorkflowStep) => void;
  onDelete: (stepId: string) => void;
  onClose: () => void;
}

type SubagentType = "builder" | "explorer" | "autonomous";

const STEP_TYPE_OPTIONS: DropdownOption<WorkflowStepType>[] = [
  { value: "agent", label: "Agent Task" },
  { value: "if", label: "If Condition" },
  { value: "switch", label: "Switch Branch" },
  { value: "merge", label: "Merge Flow" },
  { value: "approval", label: "Human Approval" },
  { value: "code", label: "Code Node (JS)" },
];

const SUBAGENT_TYPE_OPTIONS: DropdownOption<SubagentType>[] = [
  { value: "builder", label: "Builder Subagent" },
  { value: "explorer", label: "Explorer Subagent" },
  { value: "autonomous", label: "Autonomous Subagent" },
];

export const WorkflowStepEditor: React.FC<WorkflowStepEditorProps> = ({
  step,
  workflow,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const [activeField, setActiveField] = useState<"taskTemplate" | "condition" | "codeSnippet" | "approvalMessage">(
    step.type === "if" || step.type === "switch"
      ? "condition"
      : step.type === "code"
        ? "codeSnippet"
        : step.type === "approval"
          ? "approvalMessage"
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
    });
  };

  const handleInsertVariable = (varExpr: string) => {
    if (activeField === "condition" && (step.type === "if" || step.type === "switch")) {
      const current = step.condition || "";
      onUpdate({ ...step, condition: current ? `${current} ${varExpr}` : varExpr });
    } else if (activeField === "codeSnippet" && step.type === "code") {
      const current = step.codeSnippet || "";
      onUpdate({ ...step, codeSnippet: current ? `${current}\n${varExpr}` : varExpr });
    } else if (activeField === "approvalMessage" && step.type === "approval") {
      const current = step.approvalMessage || "";
      onUpdate({ ...step, approvalMessage: `${current} ${varExpr}`.trim() });
    } else {
      const current = step.taskTemplate || "";
      onUpdate({ ...step, taskTemplate: `${current} ${varExpr}`.trim() });
    }
  };

  const clearPinnedOutputs = () => {
    const next = { ...step };
    delete next.pinnedOutputs;
    onUpdate(next);
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

        {/* Variable Picker Helper */}
        <WorkflowVariablePicker
          workflow={workflow}
          currentStepId={step.id}
          onInsertVariable={handleInsertVariable}
          format={step.type === "if" || step.type === "switch" || step.type === "code" ? "raw" : "mustache"}
        />

        {(step.type === "if" || step.type === "switch") && (
          <div>
            <label className="block text-xs font-medium text-purple-300 mb-1">
              JSONata Condition
            </label>
            <input
              type="text"
              value={step.condition || ""}
              onFocus={() => setActiveField("condition")}
              onChange={(e) => onUpdate({ ...step, condition: e.target.value })}
              placeholder="$steps.step1.outputs.status = 'ok'"
              className="w-full px-3 py-1.5 rounded-lg bg-purple-950/30 border border-purple-800/40 text-purple-200 text-xs font-mono focus:outline-none focus:border-purple-500"
            />
          </div>
        )}

        {step.type === "approval" && (
          <div>
            <label className="block text-xs font-medium text-amber-300 mb-1">
              Approval Prompt Message
            </label>
            <textarea
              value={step.approvalMessage || ""}
              onFocus={() => setActiveField("approvalMessage")}
              onChange={(e) => onUpdate({ ...step, approvalMessage: e.target.value })}
              rows={3}
              placeholder="Confirm deployment to production workspace?"
              className="w-full px-3 py-1.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {step.type === "code" && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-emerald-300 mb-1">
                JS Sandbox Snippet
              </label>
              <textarea
                value={step.codeSnippet || ""}
                onFocus={() => setActiveField("codeSnippet")}
                onChange={(e) => onUpdate({ ...step, codeSnippet: e.target.value })}
                rows={6}
                placeholder="const res = $inputs.val * 2; return { outputs: { res } };"
                className="w-full px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={step.codeTimeout || 5000}
                onChange={(e) => onUpdate({ ...step, codeTimeout: Number(e.target.value) || 5000 })}
                className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs font-mono"
              />
            </div>
          </div>
        )}

        {step.type === "agent" && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Subagent Strategy
              </label>
              <Dropdown
                value={step.subagentType || "builder"}
                onChange={(val) => onUpdate({ ...step, subagentType: val })}
                options={SUBAGENT_TYPE_OPTIONS}
                matchWidth
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Agent ID (Optional)
              </label>
              <input
                type="text"
                value={step.agentId || ""}
                onChange={(e) => onUpdate({ ...step, agentId: e.target.value || undefined })}
                placeholder="Leave blank for anonymous subagent"
                className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Task Template
              </label>
              <textarea
                value={step.taskTemplate || ""}
                onFocus={() => setActiveField("taskTemplate")}
                onChange={(e) => onUpdate({ ...step, taskTemplate: e.target.value })}
                rows={4}
                placeholder="Use {{ $inputs.var }} or {{ $steps.step1.outputs.var }}"
                className="w-full px-3 py-2 rounded-lg bg-accent/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </>
        )}

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
