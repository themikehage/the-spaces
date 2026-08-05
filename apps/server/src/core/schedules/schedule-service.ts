// SPDX-License-Identifier: MIT
import {
  type CreateScheduleJob,
  type ScheduleJob,
  type ScheduleRun,
  type UpdateScheduleJob,
} from "shared";
import { sessionManager } from "../session/session-manager";
import { createUserSession } from "../session/create-user-session";
import {
  deleteJob as dbDeleteJob,
  getJob as dbGetJob,
  getRun as dbGetRun,
  insertJob as dbInsertJob,
  insertRun as dbInsertRun,
  listAllEnabledJobs as dbListAllEnabledJobs,
  listJobs as dbListJobs,
  listRuns as dbListRuns,
  recoverRunningRunsToFailed as dbRecoverRunningRunsToFailed,
  updateJob as dbUpdateJob,
  updateRun as dbUpdateRun,
} from "./db";

export class ScheduleService {
  private activeRuns = new Set<string>();
  private activeSessions = new Map<string, string>(); // runId -> sessionId

  async createJob(username: string, input: CreateScheduleJob): Promise<ScheduleJob> {
    const now = Date.now();
    const id = crypto.randomUUID();

    const job: ScheduleJob = {
      id,
      username,
      name: input.name,
      enabled: input.enabled ?? true,
      preserveSession: input.preserveSession ?? true,
      scheduleMode: input.scheduleMode,
      intervalMinutes: input.intervalMinutes ?? null,
      cronExpression: input.cronExpression ?? null,
      projectId: input.projectId ?? null,
      agentId: input.agentId ?? null,
      teamId: input.teamId ?? null,
      prompt: input.prompt,
      modelId: input.modelId ?? null,
      createdAt: now,
      updatedAt: now,
      lastRunAt: null,
      nextRunAt: null,
    };

    dbInsertJob(job);
    return job;
  }

  async getJob(username: string, jobId: string): Promise<ScheduleJob | null> {
    return dbGetJob(username, jobId);
  }

  async listJobs(
    username: string,
    filters?: { projectId?: string; agentId?: string; teamId?: string },
  ): Promise<ScheduleJob[]> {
    return dbListJobs(username, filters);
  }

  async listAllEnabledJobs(): Promise<ScheduleJob[]> {
    return dbListAllEnabledJobs();
  }

  async updateJob(
    username: string,
    jobId: string,
    input: UpdateScheduleJob,
  ): Promise<ScheduleJob | null> {
    const existing = dbGetJob(username, jobId);
    if (!existing) return null;

    const patch: Partial<ScheduleJob> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.enabled !== undefined) patch.enabled = input.enabled;
    if (input.preserveSession !== undefined) patch.preserveSession = input.preserveSession;
    if (input.scheduleMode !== undefined) patch.scheduleMode = input.scheduleMode;
    if (input.intervalMinutes !== undefined) patch.intervalMinutes = input.intervalMinutes;
    if (input.cronExpression !== undefined) patch.cronExpression = input.cronExpression;
    if (input.projectId !== undefined) patch.projectId = input.projectId;
    if (input.agentId !== undefined) patch.agentId = input.agentId;
    if (input.teamId !== undefined) patch.teamId = input.teamId;
    if (input.prompt !== undefined) patch.prompt = input.prompt;
    if (input.modelId !== undefined) patch.modelId = input.modelId;

    return dbUpdateJob(username, jobId, patch);
  }

  async deleteJob(username: string, jobId: string): Promise<boolean> {
    return dbDeleteJob(username, jobId);
  }

  async triggerRun(
    username: string,
    jobId: string,
    triggerSource: "manual" | "schedule" = "manual",
  ): Promise<ScheduleRun> {
    const job = dbGetJob(username, jobId);
    if (!job) {
      throw new Error(`Schedule job '${jobId}' not found`);
    }

    if (triggerSource === "schedule" && !job.enabled) {
      throw new Error(`Schedule job '${jobId}' is disabled`);
    }

    if (this.activeRuns.has(jobId)) {
      throw new Error(`Schedule job '${job.name}' is already running`);
    }

    const now = Date.now();
    const runId = crypto.randomUUID();

    const run: ScheduleRun = {
      id: runId,
      jobId: job.id,
      username: job.username,
      triggerSource,
      status: "running",
      sessionId: null,
      startedAt: now,
      finishedAt: null,
      responseText: null,
      errorText: null,
      createdAt: now,
    };

    dbInsertRun(run);
    this.activeRuns.add(job.id);

    // Fire and forget execution asynchronously
    this.executeJobRun(job, run).catch((err) => {
      console.error(`[ScheduleService] Error executing run ${run.id} for job ${job.id}:`, err);
    });

    return run;
  }

  private async executeJobRun(job: ScheduleJob, run: ScheduleRun): Promise<void> {
    let createdSessionId: string | null = null;
    try {
      const sessionDto = await createUserSession({
        username: job.username,
        name: `Scheduled: ${job.name}`,
        projectId: job.projectId ?? undefined,
        agentId: job.agentId ?? undefined,
        teamId: job.teamId ?? undefined,
      });

      createdSessionId = sessionDto.id;
      this.activeSessions.set(run.id, createdSessionId);
      dbUpdateRun(run.id, { sessionId: createdSessionId });

      const agentSession = (await sessionManager.getOrCreateSession(
        job.username,
        createdSessionId,
        job.projectId ?? undefined,
        job.agentId ?? undefined,
      )) as any;

      if (agentSession.modelRegistry) {
        if (job.modelId) {
          const parts = job.modelId.split("/");
          const provider = parts.length > 1 ? parts[0] : "";
          const modelId = parts.length > 1 ? parts.slice(1).join("/") : job.modelId;

          let found = provider ? agentSession.modelRegistry.find(provider, modelId) : undefined;
          if (!found) {
            found = agentSession.modelRegistry
              .getAvailable()
              .find((m: any) => m.id === job.modelId || m.id === modelId);
          }
          if (found) {
            await agentSession.setModel(found);
          }
        }

        if (!agentSession.model) {
          const available = agentSession.modelRegistry.getAvailable();
          if (available.length > 0) {
            await agentSession.setModel(available[0]);
          }
        }
      }

      if (!agentSession.model) {
        throw new Error(
          "No AI model configured for scheduled execution. Please configure an AI provider in settings.",
        );
      }

      await agentSession.prompt(job.prompt);

      // Extract last assistant text message
      const messages = agentSession.messages || [];
      const assistantMessages = messages.filter((m: any) => m.role === "assistant");
      const lastMsg = assistantMessages[assistantMessages.length - 1];

      let responseText = "";
      if (lastMsg?.content) {
        if (typeof lastMsg.content === "string") {
          responseText = lastMsg.content;
        } else if (Array.isArray(lastMsg.content)) {
          responseText = lastMsg.content
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join("\n");
        }
      }

      const now = Date.now();
      dbUpdateRun(run.id, {
        status: "completed",
        responseText: responseText || "Task completed successfully",
        finishedAt: now,
      });

      dbUpdateJob(job.username, job.id, { lastRunAt: now });
    } catch (err: any) {
      const errorMsg = err?.message || String(err || "Scheduled run failed");
      console.error(`[ScheduleService] Run ${run.id} failed:`, errorMsg);
      dbUpdateRun(run.id, {
        status: "failed",
        errorText: errorMsg,
        finishedAt: Date.now(),
      });
    } finally {
      this.activeRuns.delete(job.id);
      this.activeSessions.delete(run.id);

      if (createdSessionId && job.preserveSession === false) {
        sessionManager
          .destroySession(job.username, createdSessionId)
          .catch((e) =>
            console.error(`[ScheduleService] Error destroying session ${createdSessionId}:`, e),
          );
      }
    }
  }

  async cancelRun(username: string, jobId: string, runId: string): Promise<boolean> {
    const run = dbGetRun(username, jobId, runId);
    if (!run || run.status !== "running") {
      return false;
    }

    const sessionId = this.activeSessions.get(runId) || run.sessionId;
    if (sessionId) {
      const activeSession = sessionManager.getSession(username, sessionId);
      if (activeSession) {
        await activeSession.abort().catch(() => {});
      }
    }

    dbUpdateRun(runId, {
      status: "cancelled",
      errorText: "Cancelled by user",
      finishedAt: Date.now(),
    });

    this.activeRuns.delete(jobId);
    this.activeSessions.delete(runId);
    return true;
  }

  async listRuns(username: string, jobId: string): Promise<ScheduleRun[]> {
    return dbListRuns(username, jobId);
  }

  async getRun(username: string, jobId: string, runId: string): Promise<ScheduleRun | null> {
    return dbGetRun(username, jobId, runId);
  }

  async recoverOrphanedRuns(): Promise<number> {
    return dbRecoverRunningRunsToFailed();
  }
}
