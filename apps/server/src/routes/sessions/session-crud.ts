// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { CreateSessionSchema } from "shared";
import { sessionManager } from "../../core/session-manager";
import { authMiddleware, getAuthPayload } from "../../middleware/auth";

export const sessionCrudRouter = new Hono();

sessionCrudRouter.use("/*", authMiddleware);

sessionCrudRouter.get("/", async (c) => {
  const { username } = getAuthPayload(c);
  const search = c.req.query("search");
  const agentId = c.req.query("agentId");
  const projectId = c.req.query("projectId") ?? c.req.query("projectName");
  const status = c.req.query("status");
  const from = c.req.query("from");
  const to = c.req.query("to");

  const pageQuery = c.req.query("page");
  const perPageQuery = c.req.query("perPage");
  const page = pageQuery ? parseInt(pageQuery, 10) : undefined;
  const perPage = perPageQuery ? parseInt(perPageQuery, 10) : undefined;
  const sortBy = c.req.query("sortBy") || "updatedAt";
  const sortDir = c.req.query("sortDir") || "desc";
  const isExecutionQuery = c.req.query("isExecution");
  const isExecution = isExecutionQuery !== undefined ? isExecutionQuery === "true" : undefined;

  const allFilteredSessions = await sessionManager.listSessions(username, {
    search,
    agentId,
    projectId,
    status,
    from,
    to,
    sortBy,
    sortDir,
    isExecution,
  });

  const total = allFilteredSessions.length;
  if (page !== undefined || perPage !== undefined) {
    const p = page || 1;
    const pp = perPage || 50;
    const startIndex = (p - 1) * pp;
    const paginatedSessions = allFilteredSessions.slice(startIndex, startIndex + pp);
    return c.json({ sessions: paginatedSessions, total, page: p, perPage: pp });
  }

  return c.json({ sessions: allFilteredSessions });
});

sessionCrudRouter.get("/statuses", async (c) => {
  const { username } = getAuthPayload(c);
  const statuses = sessionManager.getLiveStatuses(username);
  return c.json({ statuses });
});

sessionCrudRouter.post("/", zValidator("json", CreateSessionSchema), async (c) => {
  const { username } = getAuthPayload(c);
  const data = c.req.valid("json");
  const session = await sessionManager.getOrCreateSession(username, crypto.randomUUID(), data.projectId, data.agentId);
  return c.json({ session }, 201);
});

sessionCrudRouter.delete("/:id", async (c) => {
  const { username } = getAuthPayload(c);
  const id = c.req.param("id");
  await sessionManager.destroySession(username, id);
  return c.json({ success: true });
});
