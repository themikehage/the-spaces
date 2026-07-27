// SPDX-License-Identifier: MIT
import { describe, expect, it } from "bun:test";
import { ScheduleRunner, ScheduleService } from "../core/schedules";

describe("Schedules DB & Service Tests", () => {
  const service = new ScheduleService();
  const runner = new ScheduleRunner(service);
  const testUser = "test_user_schedules_" + Date.now();

  it("should create a new schedule job", async () => {
    const job = await service.createJob(testUser, {
      name: "Daily Code Review",
      enabled: true,
      scheduleMode: "interval",
      intervalMinutes: 60,
      prompt: "Review recent commits and report summary",
    });

    expect(job.id).toBeDefined();
    expect(job.name).toBe("Daily Code Review");
    expect(job.intervalMinutes).toBe(60);
    expect(job.enabled).toBe(true);
  });

  it("should retrieve a created job by id", async () => {
    const job = await service.createJob(testUser, {
      name: "Nightly Security Audit",
      enabled: true,
      scheduleMode: "cron",
      cronExpression: "0 0 * * *",
      prompt: "Check for security vulnerabilities",
    });

    const retrieved = await service.getJob(testUser, job.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("Nightly Security Audit");
    expect(retrieved?.cronExpression).toBe("0 0 * * *");
  });

  it("should list jobs filtered by user", async () => {
    const jobs = await service.listJobs(testUser);
    expect(jobs.length).toBeGreaterThanOrEqual(2);
  });

  it("should update a schedule job", async () => {
    const job = await service.createJob(testUser, {
      name: "Original Name",
      enabled: true,
      scheduleMode: "interval",
      intervalMinutes: 15,
      prompt: "Do something",
    });

    const updated = await service.updateJob(testUser, job.id, {
      name: "Updated Name",
      enabled: false,
    });

    expect(updated?.name).toBe("Updated Name");
    expect(updated?.enabled).toBe(false);
  });

  it("should delete a schedule job", async () => {
    const job = await service.createJob(testUser, {
      name: "To be deleted",
      enabled: true,
      scheduleMode: "interval",
      intervalMinutes: 30,
      prompt: "Temp prompt",
    });

    const deleted = await service.deleteJob(testUser, job.id);
    expect(deleted).toBe(true);

    const check = await service.getJob(testUser, job.id);
    expect(check).toBeNull();
  });

  it("should default preserveSession to true", async () => {
    const job = await service.createJob(testUser, {
      name: "Preserved Session Job",
      enabled: true,
      scheduleMode: "interval",
      intervalMinutes: 60,
      prompt: "Keep session active",
    });

    expect(job.preserveSession).toBe(true);

    const updated = await service.updateJob(testUser, job.id, {
      preserveSession: false,
    });
    expect(updated?.preserveSession).toBe(false);
  });

  it("should safely register and unregister jobs in ScheduleRunner", async () => {
    const job = await service.createJob(testUser, {
      name: "Runner Test Job",
      enabled: true,
      scheduleMode: "cron",
      cronExpression: "*/5 * * * *",
      prompt: "Run task",
    });

    expect(() => runner.registerJob(job)).not.toThrow();
    expect(() => runner.unregisterJob(job.id)).not.toThrow();
  });
});
