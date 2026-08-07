import React from "react";
import type { WorkflowStep } from "shared";

interface ApprovalStepFormProps {
  step: WorkflowStep;
  onUpdate: (updated: WorkflowStep) => void;
  onFocusField: (field: "approvalMessage") => void;
}

export const ApprovalStepForm: React.FC<ApprovalStepFormProps> = ({
  step,
  onUpdate,
  onFocusField,
}) => {
  return (
    <div>
      <label className="block text-xs font-medium text-amber-300 mb-1">
        Approval Prompt Message
      </label>
      <textarea
        value={step.approvalMessage || ""}
        onFocus={() => onFocusField("approvalMessage")}
        onChange={(e) => onUpdate({ ...step, approvalMessage: e.target.value })}
        rows={3}
        placeholder="Confirm deployment to production workspace?"
        className="w-full px-3 py-1.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs focus:outline-none focus:border-amber-500 font-sans"
      />
    </div>
  );
};
