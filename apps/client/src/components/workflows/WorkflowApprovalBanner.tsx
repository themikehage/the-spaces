// SPDX-License-Identifier: MIT
import { Check, ShieldAlert, X } from "lucide-react";
import React, { useState } from "react";

interface WorkflowApprovalBannerProps {
  runId: string;
  stepId: string;
  message: string;
  onResolve: (approved: boolean) => Promise<void>;
}

export const WorkflowApprovalBanner: React.FC<WorkflowApprovalBannerProps> = ({
  stepId,
  message,
  onResolve,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (approved: boolean) => {
    setIsSubmitting(true);
    try {
      await onResolve(approved);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 shadow-md my-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-900/60 border border-amber-700/50 mt-0.5">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber-300">Approval Required</h4>
            <span className="text-[11px] font-mono text-amber-400/80">Step: {stepId}</span>
          </div>
          <p className="text-xs text-amber-200/90 mt-1">{message}</p>
          <div className="flex items-center gap-2 mt-3">
            <button
              disabled={isSubmitting}
              onClick={() => handleAction(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Approve Step
            </button>
            <button
              disabled={isSubmitting}
              onClick={() => handleAction(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Reject Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
