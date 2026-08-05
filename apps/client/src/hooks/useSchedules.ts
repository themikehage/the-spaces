// SPDX-License-Identifier: MIT
import { schedulesService } from "@/lib/api/schedules.service";
import { useCallback, useEffect, useState } from "react";
import type { CreateScheduleJob, ScheduleJob, ScheduleRun, UpdateScheduleJob } from "shared";

export function useSchedules(filters?: { projectId?: string; agentId?: string; teamId?: string }) {
  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await schedulesService.fetchScheduleJobs(filters);
      setJobs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, [filters?.projectId, filters?.agentId, filters?.teamId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const createJob = useCallback(
    async (data: CreateScheduleJob): Promise<ScheduleJob> => {
      const created = await schedulesService.createScheduleJob(data);
      await fetchJobs();
      return created;
    },
    [fetchJobs],
  );

  const updateJob = useCallback(
    async (jobId: string, data: UpdateScheduleJob): Promise<ScheduleJob> => {
      const updated = await schedulesService.updateScheduleJob(jobId, data);
      await fetchJobs();
      return updated;
    },
    [fetchJobs],
  );

  const deleteJob = useCallback(
    async (jobId: string): Promise<void> => {
      await schedulesService.deleteScheduleJob(jobId);
      await fetchJobs();
    },
    [fetchJobs],
  );

  const triggerRun = useCallback(
    async (jobId: string): Promise<ScheduleRun> => {
      const run = await schedulesService.triggerScheduleRun(jobId);
      await fetchJobs();
      return run;
    },
    [fetchJobs],
  );

  const getRuns = useCallback(async (jobId: string): Promise<ScheduleRun[]> => {
    return schedulesService.fetchScheduleRuns(jobId);
  }, []);

  const cancelRun = useCallback(
    async (jobId: string, runId: string): Promise<void> => {
      await schedulesService.cancelScheduleRun(jobId, runId);
      await fetchJobs();
    },
    [fetchJobs],
  );

  return {
    jobs,
    loading,
    error,
    fetchJobs,
    createJob,
    updateJob,
    deleteJob,
    triggerRun,
    getRuns,
    cancelRun,
  };
}

export function useScheduleRuns(jobId: string | null) {
  const [runs, setRuns] = useState<ScheduleRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    if (!jobId) {
      setRuns([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await schedulesService.fetchScheduleRuns(jobId);
      setRuns(data);
    } catch (err: any) {
      setError(err.message || "Failed to load schedule runs");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const cancelRun = useCallback(
    async (runId: string) => {
      if (!jobId) return;
      await schedulesService.cancelScheduleRun(jobId, runId);
      await fetchRuns();
    },
    [jobId, fetchRuns],
  );

  return {
    runs,
    loading,
    error,
    refetchRuns: fetchRuns,
    cancelRun,
  };
}
