import React from "react";
import type { WorkflowStep } from "shared";

interface ControlStepFormProps {
  step: WorkflowStep;
  onUpdate: (updated: WorkflowStep) => void;
  onFocusField: (field: "condition") => void;
}

export const ControlStepForm: React.FC<ControlStepFormProps> = ({
  step,
  onUpdate,
  onFocusField,
}) => {
  if (step.type === "merge") {
    return (
      <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-cyan-200 text-xs">
        Merges outputs from all dependencies specified in <strong>dependsOn</strong> into unified output object.
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs font-medium text-purple-300 mb-1">
        Condition Expression
      </label>
      <input
        type="text"
        value={step.condition || ""}
        onFocus={() => onFocusField("condition")}
        onChange={(e) => onUpdate({ ...step, condition: e.target.value })}
        placeholder="$steps.step1.outputs.status = 'ok'"
        className="w-full px-3 py-1.5 rounded-lg bg-purple-950/30 border border-purple-800/40 text-purple-200 text-xs font-mono focus:outline-none focus:border-purple-500"
      />
    </div>
  );
};
