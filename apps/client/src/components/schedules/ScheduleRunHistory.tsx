// SPDX-License-Identifier: MIT
import { useScheduleRuns } from "@/hooks/useSchedules";
import type { ScheduleJob, ScheduleRun } from "@spaces/core";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  RotateCcw,
} from "lucide-react";
import React, { useState } from "react";

interface Props {
  job: ScheduleJob | null;
}

export const ScheduleRunHistory: React.FC<Props> = ({ job }) => {
  const { runs, loading, refetchRuns, cancelRun } = useScheduleRuns(job?.id || null);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  if (!job) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center border border-dashed border-input rounded-xl bg-card/50">
        <Clock className="w-8 h-8 text-muted-foreground/50 mb-2" />
        <h3 className="text-sm font-medium text-foreground">No Schedule Selected</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Select a schedule job from the list to inspect its execution history and outputs.
        </p>
      </div>
    );
  }

  const toggleExpand = (runId: string) => {
    setExpandedRunId((prev) => (prev === runId ? null : runId));
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderStatusBadge = (status: ScheduleRun["status"]) => {
    switch (status) {
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-destructive/15 text-destructive border border-destructive/30">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Ban className="w-3 h-3" />
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="bg-card border border-input rounded-xl flex flex-col h-full overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-4 border-b border-input flex items-center justify-between bg-card">
        <div>
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <span>{job.name}</span>
            <span className="text-xs font-normal text-muted-foreground">Execution History</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate max-w-md">
            {job.prompt}
          </p>
        </div>
        <button
          onClick={() => refetchRuns()}
          title="Refresh run history"
          className="p-1.5 rounded-lg border border-input text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {loading && runs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading run history...
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            No runs recorded yet for this schedule job.
          </div>
        ) : (
          runs.map((run) => {
            const isExpanded = expandedRunId === run.id;
            return (
              <div
                key={run.id}
                className="border border-input rounded-xl bg-background/50 hover:bg-background transition-colors overflow-hidden text-xs"
              >
                {/* Row Header */}
                <div
                  onClick={() => toggleExpand(run.id)}
                  className="p-3 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <button className="text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {renderStatusBadge(run.status)}
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {formatTimestamp(run.startedAt)}
                    </span>
                    <span className="capitalize px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground text-[10px]">
                      {run.triggerSource}
                    </span>
                  </div>

                  {run.status === "running" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelRun(run.id);
                      }}
                      className="px-2.5 py-1 rounded-md bg-destructive/15 hover:bg-destructive/25 text-destructive font-medium text-[11px] transition-colors cursor-pointer"
                    >
                      Cancel Run
                    </button>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="p-3 border-t border-input/60 bg-muted/20 space-y-2">
                    {run.errorText && (
                      <div className="p-2.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive font-mono text-[11px] whitespace-pre-wrap">
                        {run.errorText}
                      </div>
                    )}

                    {run.responseText && (
                      <div className="space-y-1">
                        <span className="font-semibold text-foreground text-[11px] block">
                          Assistant Response Output:
                        </span>
                        <div className="p-3 rounded-lg bg-background border border-input font-mono text-[11px] text-foreground leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                          {run.responseText}
                        </div>
                      </div>
                    )}

                    {!run.errorText && !run.responseText && (
                      <div className="text-muted-foreground italic text-[11px]">
                        No text output recorded for this run.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
