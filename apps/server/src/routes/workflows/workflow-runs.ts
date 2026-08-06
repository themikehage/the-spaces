// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { workflowEngine } from "../../core/workflows/workflow-engine-instance";
import { authMiddleware, getAuthPayload } from "../../middleware/auth";

export const workflowRunsRouter = new Hono();

workflowRunsRouter.use("/*", authMiddleware);

const RunWorkflowBodySchema = z.object({
  inputs: z.record(z.unknown()).optional(),
  parentSessionId: z.string().optional(),
});

workflowRunsRouter.post("/:id/run", zValidator("json", RunWorkflowBodySchema), async (c) => {
  const { username } = getAuthPayload(c);
  const workflowId = c.req.param("id");
  const body = c.req.valid("json");

  try {
    const run = await workflowEngine.run(username, workflowId, body);
    return c.json(run, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to run workflow" }, 400);
  }
});

workflowRunsRouter.get("/:id/runs", async (c) => {
  const { username } = getAuthPayload(c);
  const workflowId = c.req.param("id");
  const runs = workflowEngine.listRuns(username, workflowId);
  return c.json(runs);
});

workflowRunsRouter.get("/runs/:runId", async (c) => {
  const { username } = getAuthPayload(c);
  const runId = c.req.param("runId");
  const run = workflowEngine.getRunStatus(username, runId);
  if (!run) {
    return c.json({ error: `Run '${runId}' not found` }, 404);
  }
  return c.json(run);
});

workflowRunsRouter.post("/runs/:runId/abort", async (c) => {
  const { username } = getAuthPayload(c);
  const runId = c.req.param("runId");
  await workflowEngine.abort(username, runId);
  return c.json({ success: true });
});

workflowRunsRouter.post("/runs/:runId/steps/:stepId/approve", async (c) => {
  const { username } = getAuthPayload(c);
  const runId = c.req.param("runId");
  const stepId = c.req.param("stepId");
  await workflowEngine.approveStep(username, runId, stepId);
  return c.json({ success: true });
});

workflowRunsRouter.post("/runs/:runId/steps/:stepId/reject", async (c) => {
  const { username } = getAuthPayload(c);
  const runId = c.req.param("runId");
  const stepId = c.req.param("stepId");
  await workflowEngine.rejectStep(username, runId, stepId);
  return c.json({ success: true });
});
