// SPDX-License-Identifier: MIT
import { History } from "lucide-react";
import React from "react";
import type { WorkflowRun } from "shared";

interface WorkflowRunHistoryPanelProps {
  runs: WorkflowRun[];
  onSelectRun: (run: WorkflowRun) => void;
}

export const WorkflowRunHistoryPanel: React.FC<WorkflowRunHistoryPanelProps> = ({
  runs,
  onSelectRun,
}) => {
  return (
    <div className="w-72 border-r border-zinc-800 bg-zinc-900/60 p-4 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800 text-zinc-100 font-semibold text-sm">
        <History className="w-4 h-4 text-zinc-400" />
        <span>Execution History</span>
      </div>

      <div className="space-y-2 flex-1">
        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => onSelectRun(run)}
            className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-800/40 cursor-pointer transition flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-mono text-zinc-200">Run #{run.id.slice(0, 6)}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {new Date(run.startedAt).toLocaleTimeString()}
              </p>
            </div>
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                run.status === "success"
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                  : run.status === "error"
                    ? "bg-rose-950/60 text-rose-400 border-rose-800/40"
                    : "bg-blue-950/60 text-blue-400 border-blue-800/40"
              }`}
            >
              {run.status}
            </span>
          </div>
        ))}

        {runs.length === 0 && (
          <p className="text-xs text-zinc-500 italic text-center py-6">No previous runs.</p>
        )}
      </div>
    </div>
  );
};
