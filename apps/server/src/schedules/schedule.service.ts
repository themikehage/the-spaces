import type { IScheduleService, ScheduledJob } from "@spaces/core";

export class ScheduleService implements IScheduleService {
  private jobs = new Map<string, ScheduledJob>();

  async listJobs(): Promise<ScheduledJob[]> {
    return Array.from(this.jobs.values());
  }

  async createJob(job: Omit<ScheduledJob, "id" | "createdAt">): Promise<ScheduledJob> {
    const id = crypto.randomUUID();
    const newJob: ScheduledJob = {
      ...job,
      id,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(id, newJob);
    return newJob;
  }

  async deleteJob(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async toggleJob(id: string, enabled: boolean): Promise<ScheduledJob | null> {
    const job = this.jobs.get(id);
    if (!job) return null;
    job.enabled = enabled;
    this.jobs.set(id, job);
    return job;
  }
}
