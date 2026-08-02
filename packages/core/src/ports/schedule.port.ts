export interface ScheduledJob {
  id: string;
  name: string;
  cron: string;
  prompt: string;
  enabled: boolean;
  createdAt: string;
}

export interface IScheduleService {
  listJobs(): Promise<ScheduledJob[]>;
  createJob(job: Omit<ScheduledJob, "id" | "createdAt">): Promise<ScheduledJob>;
  deleteJob(id: string): Promise<boolean>;
  toggleJob(id: string, enabled: boolean): Promise<ScheduledJob | null>;
}
