// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import { webhookStore } from "../core/workflows/webhook-store";
import { workflowEngine } from "../core/workflows/workflow-engine-instance";
import { workflowRunStore } from "../core/workflows/workflow-run-store";

export const webhooksRouter = new Hono();

webhooksRouter.all("/:webhookId", async (c) => {
  const webhookId = c.req.param("webhookId");
  const registration = webhookStore.findWebhook(webhookId);

  if (!registration) {
    return c.json({ error: `Webhook '${webhookId}' not found.` }, 404);
  }

  const { username, workflowId, secret, responseMode } = registration;

  // Validate secret if configured
  if (secret) {
    const authHeader = c.req.header("Authorization") || c.req.header("X-Webhook-Secret");
    const signature = c.req.header("X-Webhook-Signature");

    if (authHeader && authHeader !== secret && authHeader !== `Bearer ${secret}`) {
      return c.json({ error: "Invalid webhook secret authorization" }, 401);
    }
    if (signature && signature !== secret) {
      return c.json({ error: "Invalid webhook signature" }, 401);
    }
  }

  let body: unknown = null;
  const method = c.req.method;
  const query = c.req.query();
  const headers = c.req.header();

  if (method !== "GET" && method !== "HEAD") {
    try {
      body = await c.req.json();
    } catch {
      try {
        body = await c.req.text();
      } catch {
        body = null;
      }
    }
  }

  const inputs = {
    body,
    headers,
    query,
    method,
    webhookId,
  };

  try {
    const run = await workflowEngine.run(username, workflowId, { inputs });

    if (responseMode === "onWorkflowCompleted") {
      // Poll briefly for completion (up to 5 seconds)
      const maxWait = 5000;
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        const currentRun = workflowRunStore.getRun(username, run.id);
        if (currentRun && (currentRun.status === "success" || currentRun.status === "error" || currentRun.status === "cancelled")) {
          return c.json({
            success: currentRun.status === "success",
            runId: run.id,
            status: currentRun.status,
            stepStates: currentRun.stepStates,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return c.json(
      {
        success: true,
        message: "Webhook received and workflow execution started",
        runId: run.id,
        status: run.status,
      },
      202,
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Failed to trigger workflow: ${errorMsg}` }, 500);
  }
});
