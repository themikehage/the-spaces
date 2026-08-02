// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import type { AppContext } from "../../context";
import { getUsername } from "../../lib/auth-helpers";
import { authMiddleware } from "../../middleware/auth";

export const runsCrudRouter = new Hono<{ Variables: { appContext: AppContext } }>();

runsCrudRouter.use("/*", authMiddleware);

runsCrudRouter.post("/:jobId/run", async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const jobId = c.req.param("jobId");
  const { scheduleService } = c.get("appContext");
  try {
    const run = await scheduleService.triggerRun(username, jobId, "manual");
    return c.json(run, 202);
  } catch (err: any) {
    return c.json({ error: err?.message || "Failed to trigger schedule run" }, 400);
  }
});

runsCrudRouter.get("/:jobId/runs", async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const jobId = c.req.param("jobId");
  const { scheduleService } = c.get("appContext");
  const runs = await scheduleService.listRuns(username, jobId);
  return c.json(runs);
});

runsCrudRouter.get("/:jobId/runs/:runId", async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const jobId = c.req.param("jobId");
  const runId = c.req.param("runId");

  const { scheduleService } = c.get("appContext");
  const run = await scheduleService.getRun(username, jobId, runId);
  if (!run) return c.json({ error: "Schedule run not found" }, 404);

  return c.json(run);
});

runsCrudRouter.post("/:jobId/runs/:runId/cancel", async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const jobId = c.req.param("jobId");
  const runId = c.req.param("runId");

  const { scheduleService } = c.get("appContext");
  const success = await scheduleService.cancelRun(username, jobId, runId);
  if (!success) {
    return c.json({ error: "Schedule run is not running or not found" }, 400);
  }

  return c.json({ success: true });
});
