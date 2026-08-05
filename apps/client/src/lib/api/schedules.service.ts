// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type { CreateScheduleJob, ScheduleJob, ScheduleRun, UpdateScheduleJob } from "shared";

async function fetchScheduleJobs(filters?: {
  projectId?: string;
  agentId?: string;
  teamId?: string;
}): Promise<ScheduleJob[]> {
  const params = new URLSearchParams();
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.agentId) params.set("agentId", filters.agentId);
  if (filters?.teamId) params.set("teamId", filters.teamId);

  const queryStr = params.toString();
  const url = `/api/schedules${queryStr ? `?${queryStr}` : ""}`;

  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch schedules: ${res.statusText}`);
  return res.json();
}

async function fetchScheduleJob(jobId: string): Promise<ScheduleJob> {
  const res = await apiFetch(`/api/schedules/${jobId}`);
  if (!res.ok) throw new Error(`Failed to fetch schedule job: ${res.statusText}`);
  return res.json();
}

async function createScheduleJob(data: CreateScheduleJob): Promise<ScheduleJob> {
  const res = await apiFetch("/api/schedules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to create schedule job");
  }
  return res.json();
}

async function updateScheduleJob(jobId: string, data: UpdateScheduleJob): Promise<ScheduleJob> {
  const res = await apiFetch(`/api/schedules/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to update schedule job");
  }
  return res.json();
}

async function deleteScheduleJob(jobId: string): Promise<void> {
  const res = await apiFetch(`/api/schedules/${jobId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete schedule job: ${res.statusText}`);
}

async function triggerScheduleRun(jobId: string): Promise<ScheduleRun> {
  const res = await apiFetch(`/api/schedules/${jobId}/run`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to trigger schedule run");
  }
  return res.json();
}

async function fetchScheduleRuns(jobId: string): Promise<ScheduleRun[]> {
  const res = await apiFetch(`/api/schedules/${jobId}/runs`);
  if (!res.ok) throw new Error(`Failed to fetch schedule runs: ${res.statusText}`);
  return res.json();
}

async function cancelScheduleRun(jobId: string, runId: string): Promise<void> {
  const res = await apiFetch(`/api/schedules/${jobId}/runs/${runId}/cancel`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to cancel schedule run");
  }
}

export const schedulesService = {
  fetchScheduleJobs,
  fetchScheduleJob,
  createScheduleJob,
  updateScheduleJob,
  deleteScheduleJob,
  triggerScheduleRun,
  fetchScheduleRuns,
  cancelScheduleRun,
};
