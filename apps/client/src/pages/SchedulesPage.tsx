// SPDX-License-Identifier: MIT
import { ScheduleJobDialog } from "@/components/schedules/ScheduleJobDialog";
import { ScheduleRunHistory } from "@/components/schedules/ScheduleRunHistory";
import { useAgents } from "@/hooks/useAgents";
import { useSchedules } from "@/hooks/useSchedules";
import { useTeams } from "@/hooks/useTeams";
import { apiFetch } from "@/lib/api";
import { Calendar, Clock, Loader2, Play, Plus, Power, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { CreateScheduleJob, ScheduleJob } from "shared";

interface Props {
  projectId?: string;
}

export const SchedulesPage: React.FC<Props> = ({ projectId }) => {
  const { jobs, loading, createJob, updateJob, deleteJob, triggerRun } = useSchedules(
    projectId ? { projectId } : undefined,
  );

  const { agents } = useAgents();
  const { teams } = useTeams();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const [selectedJob, setSelectedJob] = useState<ScheduleJob | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ScheduleJob | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await apiFetch("/api/workspace-projects");
        if (res.ok) {
          const data = await res.json();
          const items = (data.projects || []).map((p: any) => ({
            id: p.id || p.name,
            name: p.name,
          }));
          setProjects(items);
        }
      } catch { /* noop */ }
    }
    fetchProjects();
  }, []);

  // Update selectedJob when jobs list refetches
  useEffect(() => {
    if (selectedJob) {
      const fresh = jobs.find((j) => j.id === selectedJob.id);
      if (fresh) {
        setSelectedJob(fresh);
      }
    } else if (jobs.length > 0) {
      setSelectedJob(jobs[0]);
    }
  }, [jobs]);

  const handleOpenCreate = () => {
    setEditingJob(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (job: ScheduleJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingJob(job);
    setDialogOpen(true);
  };

  const handleToggleEnable = async (job: ScheduleJob, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateJob(job.id, { enabled: !job.enabled });
  };

  const handleDelete = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this scheduled job?")) {
      await deleteJob(jobId);
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
      }
    }
  };

  const handleTriggerRun = async (job: ScheduleJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setRunningJobId(job.id);
    try {
      await triggerRun(job.id);
    } catch (err: any) {
      alert(err.message || "Failed to run schedule job");
    } finally {
      setRunningJobId(null);
    }
  };

  const handleSaveDialog = async (data: CreateScheduleJob) => {
    if (editingJob) {
      await updateJob(editingJob.id, data);
    } else {
      await createJob(data);
    }
  };

  const getScopeBadge = (job: ScheduleJob) => {
    if (job.projectId) {
      const projName = projects.find((p) => p.id === job.projectId)?.name || job.projectId;
      return (
        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium">
          Project: {projName}
        </span>
      );
    }
    if (job.agentId) {
      const agentName = agents.find((a) => a.id === job.agentId)?.name || job.agentId;
      return (
        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-medium">
          Agent: {agentName}
        </span>
      );
    }
    if (job.teamId) {
      const teamName = teams.find((t) => t.id === job.teamId)?.name || job.teamId;
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium">
          Team: {teamName}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-input text-[10px] font-medium">
        Global Agent
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-input pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Scheduled Tasks
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Automate recurring AI agent executions with fixed intervals or cron schedules.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Schedule</span>
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Job Cards List */}
        <div className="col-span-12 md:col-span-5 flex flex-col min-h-0 overflow-y-auto space-y-3 pr-1">
          {loading && jobs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading schedules...
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-input rounded-xl bg-card">
              <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-foreground">No Schedules Configured</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Create a scheduled job to automate background code analysis, tasks, or maintenance.
              </p>
              <button
                onClick={handleOpenCreate}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Schedule</span>
              </button>
            </div>
          ) : (
            jobs.map((job) => {
              const isSelected = selectedJob?.id === job.id;
              const isRunningThis = runningJobId === job.id;

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-input bg-card hover:border-muted-foreground/30 hover:bg-card/80"
                  } ${!job.enabled ? "opacity-60" : ""}`}
                >
                  {/* Job Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                        {job.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {getScopeBadge(job)}
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.scheduleMode === "interval"
                            ? `Every ${job.intervalMinutes}m`
                            : `Cron: ${job.cronExpression}`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleToggleEnable(job, e)}
                      title={job.enabled ? "Disable schedule" : "Enable schedule"}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        job.enabled
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-muted/50 border-input text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Prompt Snippet */}
                  <p className="text-xs text-muted-foreground font-mono bg-background/80 p-2 rounded-lg border border-input/50 line-clamp-2">
                    {job.prompt}
                  </p>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-input/40">
                    <span className="text-[10px] text-muted-foreground">
                      {job.lastRunAt
                        ? `Last run: ${new Date(job.lastRunAt).toLocaleTimeString()}`
                        : "Never run yet"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleTriggerRun(job, e)}
                        disabled={isRunningThis}
                        title="Run now"
                        className="px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium text-[11px] transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      >
                        {isRunningThis ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        <span>Run Now</span>
                      </button>

                      <button
                        onClick={(e) => handleOpenEdit(job, e)}
                        title="Edit schedule"
                        className="px-2.5 py-1 rounded-md border border-input text-muted-foreground hover:text-foreground font-medium text-[11px] transition-colors cursor-pointer"
                      >
                        Edit
                      </button>

                      <button
                        onClick={(e) => handleDelete(job.id, e)}
                        title="Delete schedule"
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Run History Detail */}
        <div className="col-span-12 md:col-span-7 flex flex-col min-h-0">
          <ScheduleRunHistory job={selectedJob} />
        </div>
      </div>

      {/* Schedule Dialog */}
      <ScheduleJobDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveDialog}
        initialData={editingJob}
        projects={projects}
        agents={agents.map((a) => ({ id: a.id, name: a.name }))}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
};
