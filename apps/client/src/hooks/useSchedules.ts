// SPDX-License-Identifier: MIT
import {
  cancelScheduleRun,
  createScheduleJob,
  deleteScheduleJob,
  fetchScheduleJobs,
  fetchScheduleRuns,
  triggerScheduleRun,
  updateScheduleJob,
} from "@/lib/api/schedules";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CreateScheduleJob, ScheduleJob, ScheduleRun, UpdateScheduleJob } from "shared";

export function useSchedules(filters?: { projectId?: string; agentId?: string; teamId?: string }) {
  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScheduleJobs(filters);
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
      const created = await createScheduleJob(data);
      await fetchJobs();
      return created;
    },
    [fetchJobs],
  );

  const updateJob = useCallback(
    async (jobId: string, data: UpdateScheduleJob): Promise<ScheduleJob> => {
      const updated = await updateScheduleJob(jobId, data);
      await fetchJobs();
      return updated;
    },
    [fetchJobs],
  );

  const deleteJob = useCallback(
    async (jobId: string): Promise<void> => {
      await deleteScheduleJob(jobId);
      await fetchJobs();
    },
    [fetchJobs],
  );

  const triggerRun = useCallback(
    async (jobId: string): Promise<ScheduleRun> => {
      const run = await triggerScheduleRun(jobId);
      await fetchJobs();
      return run;
    },
    [fetchJobs],
  );

  return {
    jobs,
    loading,
    error,
    refetchJobs: fetchJobs,
    createJob,
    updateJob,
    deleteJob,
    triggerRun,
  };
}

export function useScheduleRuns(jobId: string | null) {
  const [runs, setRuns] = useState<ScheduleRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRuns = useCallback(async () => {
    if (!jobId) {
      setRuns([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScheduleRuns(jobId);
      setRuns(data);
    } catch (err: any) {
      setError(err.message || "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Auto-poll runs every 3s if any run is 'running'
  useEffect(() => {
    const hasRunning = runs.some((r) => r.status === "running");

    if (hasRunning && jobId) {
      pollTimer.current = setInterval(async () => {
        try {
          const data = await fetchScheduleRuns(jobId);
          setRuns(data);
        } catch {}
      }, 3000);
    } else if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [runs, jobId]);

  const cancelRun = useCallback(
    async (runId: string): Promise<void> => {
      if (!jobId) return;
      await cancelScheduleRun(jobId, runId);
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
