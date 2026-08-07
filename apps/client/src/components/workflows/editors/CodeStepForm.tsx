import React from "react";
import type { WorkflowStep } from "shared";

interface CodeStepFormProps {
  step: WorkflowStep;
  onUpdate: (updated: WorkflowStep) => void;
  onFocusField: (field: "codeSnippet") => void;
}

export const CodeStepForm: React.FC<CodeStepFormProps> = ({
  step,
  onUpdate,
  onFocusField,
}) => {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs font-medium text-emerald-300 mb-1">
          JS Sandbox Snippet
        </label>
        <textarea
          value={step.codeSnippet || ""}
          onFocus={() => onFocusField("codeSnippet")}
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
  );
};
