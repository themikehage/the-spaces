// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { WorkflowDefinitionSchema } from "shared";
import { workflowEngine } from "../../core/workflows/workflow-engine-instance";
import { authMiddleware, getAuthPayload } from "../../middleware/auth";

export const workflowCrudRouter = new Hono();

workflowCrudRouter.use("/*", authMiddleware);

workflowCrudRouter.get("/", async (c) => {
  const { username } = getAuthPayload(c);
  const scopeType = c.req.query("scopeType");
  const entityId = c.req.query("entityId");
  const workflows = workflowEngine.list(username, { scopeType, entityId });
  return c.json(workflows);
});

workflowCrudRouter.post("/", zValidator("json", WorkflowDefinitionSchema), async (c) => {
  const { username } = getAuthPayload(c);
  const body = c.req.valid("json");
  const saved = await workflowEngine.save(username, body);
  return c.json(saved, 201);
});

workflowCrudRouter.get("/:id", async (c) => {
  const { username } = getAuthPayload(c);
  const id = c.req.param("id");
  const def = workflowEngine.get(username, id);
  if (!def) {
    return c.json({ error: `Workflow '${id}' not found` }, 404);
  }
  return c.json(def);
});

workflowCrudRouter.put("/:id", zValidator("json", WorkflowDefinitionSchema), async (c) => {
  const { username } = getAuthPayload(c);
  const id = c.req.param("id");
  const body = c.req.valid("json");

  if (body.id !== id) {
    return c.json({ error: "Route ID does not match body ID" }, 400);
  }

  const updated = await workflowEngine.save(username, body);
  return c.json(updated);
});

workflowCrudRouter.delete("/:id", async (c) => {
  const { username } = getAuthPayload(c);
  const id = c.req.param("id");
  await workflowEngine.delete(username, id);
  return c.json({ success: true });
});
