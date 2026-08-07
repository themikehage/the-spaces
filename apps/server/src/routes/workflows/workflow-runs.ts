// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { workflowEngine } from "../../core/workflows/workflow-engine-instance";
import { workflowApprovalStore } from "../../core/workflows/workflow-approval-store";
import { authMiddleware, getAuthPayload } from "../../middleware/auth";

export const workflowRunsRouter = new Hono();

workflowRunsRouter.use("/*", authMiddleware);

const RunWorkflowBodySchema = z.object({
  inputs: z.record(z.unknown()).optional(),
  parentSessionId: z.string().optional(),
  dryRun: z.boolean().optional(),
});

const ApproveStepBodySchema = z.object({
  approved: z.boolean(),
});

workflowRunsRouter.post("/:id/run", zValidator("json", RunWorkflowBodySchema), async (c) => {
  const { username } = getAuthPayload(c);
  const workflowId = c.req.param("id");
  const body = c.req.valid("json");

  try {
    const run = await workflowEngine.run(username, workflowId, body);
    return c.json(run, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to run workflow";
    return c.json({ error: message }, 400);
  }
});

const ListRunsQuerySchema = z.object({
  workflowId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().optional(),
});

workflowRunsRouter.get("/runs", zValidator("query", ListRunsQuerySchema), async (c) => {
  const { username } = getAuthPayload(c);
  const query = c.req.valid("query");
  const runs = workflowEngine.listRuns(username, query);
  return c.json(runs);
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

workflowRunsRouter.post(
  "/runs/:runId/steps/:stepId/approve",
  zValidator("json", ApproveStepBodySchema),
  async (c) => {
    const runId = c.req.param("runId");
    const stepId = c.req.param("stepId");
    const { approved } = c.req.valid("json");

    const resolved = workflowApprovalStore.resolveApproval(runId, stepId, approved);
    if (!resolved) {
      return c.json({ error: `Pending approval not found for run '${runId}' step '${stepId}'` }, 404);
    }
    return c.json({ success: true, approved });
  },
);
