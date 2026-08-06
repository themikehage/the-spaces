// SPDX-License-Identifier: MIT
import { Trash2, X } from "lucide-react";
import React from "react";
import type { WorkflowStep } from "shared";

interface WorkflowStepEditorProps {
  step: WorkflowStep;
  allStepIds: string[];
  onUpdate: (updated: WorkflowStep) => void;
  onDelete: (stepId: string) => void;
  onClose: () => void;
}

export const WorkflowStepEditor: React.FC<WorkflowStepEditorProps> = ({
  step,
  allStepIds,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const availableDependsOn = allStepIds.filter((id) => id !== step.id);

  const toggleDependency = (depId: string) => {
    const current = step.dependsOn || [];
    const exists = current.includes(depId);
    const next = exists ? current.filter((id) => id !== depId) : [...current, depId];
    onUpdate({ ...step, dependsOn: next });
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
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition"
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
          <label className="block text-xs font-medium text-muted-foreground mb-1">Step ID</label>
          <input
            type="text"
            value={step.id}
            onChange={(e) => onUpdate({ ...step, id: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Step Type</label>
          <div className="w-full px-3 py-1.5 rounded-lg bg-accent/30 border border-border text-foreground text-xs font-medium">
            Agent
          </div>
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
            onChange={(e) => onUpdate({ ...step, taskTemplate: e.target.value })}
            rows={4}
            placeholder="Use {{inputs.var}} or {{stepId.outputs.var}}"
            className="w-full px-3 py-2 rounded-lg bg-accent/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Subagent Type
          </label>
          <select
            value={step.subagentType || "builder"}
            onChange={(e) => onUpdate({ ...step, subagentType: e.target.value as any })}
            className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
          >
            <option value="builder">Builder</option>
            <option value="explorer">Explorer</option>
            <option value="autonomous">Autonomous</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Max Steps
          </label>
          <input
            type="number"
            value={step.maxSteps || ""}
            onChange={(e) =>
              onUpdate({ ...step, maxSteps: Number(e.target.value) || undefined })
            }
            placeholder="25"
            className="w-full px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-primary"
          />
        </div>

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
                    className="rounded border-border bg-background text-primary focus:ring-primary"
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
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs border border-destructive/20 transition font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Step
        </button>
      </div>
    </div>
  );
};
