// SPDX-License-Identifier: MIT
import { ScheduleJobDialog } from "@/components/schedules/ScheduleJobDialog";
import { ScheduleRunHistory } from "@/components/schedules/ScheduleRunHistory";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeaderWithActions } from "@/components/ui/HeaderWithActions";
import { IconButton } from "@/components/ui/IconButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAgents } from "@/hooks/useAgents";
import { useSchedules } from "@/hooks/useSchedules";
import { useTeams } from "@/hooks/useTeams";
import { projectsService } from "@/lib/api/projects.service";
import { Calendar, Clock, Pencil, Play, Plus, Power, Trash2 } from "lucide-react";
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
        const data = await projectsService.fetchProjects();
        const items = ((data as any).projects || data || []).map((p: any) => ({
          id: p.id || p.name,
          name: p.name,
        }));
        setProjects(items);
      } catch {
        /* noop */
      }
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
      return <Badge variant="info">Project: {projName}</Badge>;
    }
    if (job.agentId) {
      const agentName = agents.find((a) => a.id === job.agentId)?.name || job.agentId;
      return <Badge variant="primary">Agent: {agentName}</Badge>;
    }
    if (job.teamId) {
      const teamName = teams.find((t) => t.id === job.teamId)?.name || job.teamId;
      return <Badge variant="warning">Team: {teamName}</Badge>;
    }
    return <Badge variant="secondary">Global Agent</Badge>;
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden font-sans">
      <HeaderWithActions
        title="Scheduled Tasks"
        subtitle="Automate recurring AI agent executions with fixed intervals or cron schedules"
        icon={Calendar}
        count={jobs.length}
        isRefreshing={loading}
        primaryAction={{
          label: "New Schedule",
          icon: Plus,
          onClick: handleOpenCreate,
        }}
      />

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col min-h-0">
        <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
          <div className="col-span-12 md:col-span-5 flex flex-col min-h-0 overflow-y-auto space-y-3 pr-1">
            {loading && jobs.length === 0 ? (
              <LoadingState label="Loading schedules..." fullPage={false} className="py-12" />
            ) : jobs.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No Schedules Configured"
                description="Create a scheduled job to automate background code analysis, tasks, or maintenance."
                actionLabel="Create Schedule"
                onAction={handleOpenCreate}
                actionIcon={Plus}
                className="py-12 border border-dashed border-input rounded-xl bg-card"
              />
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
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-foreground">{job.name}</h4>
                          {getScopeBadge(job)}
                        </div>
                        {job.prompt && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {job.prompt}
                          </p>
                        )}
                      </div>
                      <Badge variant={job.enabled ? "success" : "secondary"} size="xs">
                        {job.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-input/40">
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <Clock className="w-3 h-3 text-primary" />
                        <span>
                          {job.scheduleMode === "cron"
                            ? job.cronExpression
                            : `Every ${job.intervalMinutes}m`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconButton
                          icon={Play}
                          size="xs"
                          loading={isRunningThis}
                          tooltip="Run now"
                          onClick={(e) => handleTriggerRun(job, e)}
                        />
                        <IconButton
                          icon={Power}
                          size="xs"
                          active={job.enabled}
                          tooltip={job.enabled ? "Disable job" : "Enable job"}
                          onClick={(e) => handleToggleEnable(job, e)}
                        />
                        <IconButton
                          icon={Pencil}
                          size="xs"
                          tooltip="Edit job"
                          onClick={(e) => handleOpenEdit(job, e)}
                        />
                        <IconButton
                          icon={Trash2}
                          size="xs"
                          variant="ghost-destructive"
                          tooltip="Delete job"
                          onClick={(e) => handleDelete(job.id, e)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="col-span-12 md:col-span-7 flex flex-col min-h-0">
            <ScheduleRunHistory job={selectedJob} />
          </div>
        </div>
      </div>

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
