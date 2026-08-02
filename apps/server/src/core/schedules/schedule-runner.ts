// SPDX-License-Identifier: MIT
import { type ScheduleJob } from "@spaces/core";
import { Cron } from "croner";
import { type ScheduleService } from "./schedule-service";

interface JobRunnerEntry {
  cron?: Cron;
  timer?: ReturnType<typeof setInterval>;
}

export class ScheduleRunner {
  private runners = new Map<string, JobRunnerEntry>();
  private isRunning = false;

  constructor(private service: ScheduleService) {}

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const recoveredCount = await this.service.recoverOrphanedRuns();
      if (recoveredCount > 0) {
        console.log(
          `[ScheduleRunner] Recovered ${recoveredCount} dangling running runs to failed state.`,
        );
      }

      const jobs = await this.service.listAllEnabledJobs();
      console.log(`[ScheduleRunner] Registering ${jobs.length} enabled schedule jobs...`);
      for (const job of jobs) {
        this.registerJob(job);
      }
    } catch (err) {
      console.error("[ScheduleRunner] Failed during startup:", err);
    }
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const [jobId] of this.runners) {
      this.unregisterJob(jobId);
    }
    console.log("[ScheduleRunner] Stopped all scheduled runners.");
  }

  registerJob(job: ScheduleJob): void {
    this.unregisterJob(job.id);

    if (!job.enabled) return;

    const runTask = async () => {
      try {
        console.log(`[ScheduleRunner] Triggering scheduled job '${job.name}' (${job.id})`);
        await this.service.triggerRun(job.username, job.id, "schedule");
      } catch (err: any) {
        console.error(
          `[ScheduleRunner] Execution error for job '${job.name}':`,
          err?.message || err,
        );
      }
    };

    if (job.scheduleMode === "cron" && job.cronExpression) {
      try {
        const cronInstance = new Cron(job.cronExpression, { protect: true }, runTask);
        this.runners.set(job.id, { cron: cronInstance });
        console.log(
          `[ScheduleRunner] Registered cron job '${job.name}' with pattern '${job.cronExpression}'`,
        );
      } catch (err) {
        console.error(
          `[ScheduleRunner] Invalid cron expression '${job.cronExpression}' for job '${job.name}':`,
          err,
        );
      }
    } else if (job.scheduleMode === "interval" && job.intervalMinutes) {
      const intervalMs = Math.max(1, job.intervalMinutes) * 60 * 1000;
      const timer = setInterval(runTask, intervalMs);
      this.runners.set(job.id, { timer });
      console.log(
        `[ScheduleRunner] Registered interval job '${job.name}' every ${job.intervalMinutes} min`,
      );
    }
  }

  unregisterJob(jobId: string): void {
    const entry = this.runners.get(jobId);
    if (!entry) return;

    if (entry.cron) {
      entry.cron.stop();
    }
    if (entry.timer) {
      clearInterval(entry.timer);
    }

    this.runners.delete(jobId);
  }

  onJobChanged(job: ScheduleJob): void {
    this.unregisterJob(job.id);
    if (job.enabled) {
      this.registerJob(job);
    }
  }

  onJobDeleted(jobId: string): void {
    this.unregisterJob(jobId);
  }
}
