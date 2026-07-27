// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { CreateScheduleJobSchema, UpdateScheduleJobSchema } from "shared";
import { scheduleRunner, scheduleService } from "../../core/schedules";
import { getUsername } from "../../lib/auth-helpers";
import { authMiddleware } from "../../middleware/auth";

export const jobsCrudRouter = new Hono();

jobsCrudRouter.use("/*", authMiddleware);

jobsCrudRouter.get("/", async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.query("projectId");
  const agentId = c.req.query("agentId");
  const teamId = c.req.query("teamId");

  const jobs = await scheduleService.listJobs(username, { projectId, agentId, teamId });
  return c.json(jobs);
});

jobsCrudRouter.post("/", zValidator("json", CreateScheduleJobSchema), async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const input = c.req.valid("json");
  const job = await scheduleService.createJob(username, input);
  scheduleRunner.onJobChanged(job);

  return c.json(job, 201);
});

jobsCrudRouter.get("/:jobId", async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const jobId = c.req.param("jobId");
  const job = await scheduleService.getJob(username, jobId);
  if (!job) return c.json({ error: "Schedule job not found" }, 404);

  return c.json(job);
});

jobsCrudRouter.patch("/:jobId", zValidator("json", UpdateScheduleJobSchema), async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const jobId = c.req.param("jobId");
  const input = c.req.valid("json");

  const updated = await scheduleService.updateJob(username, jobId, input);
  if (!updated) return c.json({ error: "Schedule job not found" }, 404);

  scheduleRunner.onJobChanged(updated);
  return c.json(updated);
});

jobsCrudRouter.delete("/:jobId", async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const jobId = c.req.param("jobId");
  const success = await scheduleService.deleteJob(username, jobId);
  if (!success) return c.json({ error: "Schedule job not found" }, 404);

  scheduleRunner.onJobDeleted(jobId);
  return c.json({ success: true });
});
