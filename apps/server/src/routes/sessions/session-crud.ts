// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { CreateSessionSchema } from "shared";
import { sessionManager } from "../../core/session-manager";
import { authMiddleware, getAuthPayload } from "../../middleware/auth";

import { createUserSession, SessionDomainError } from "../../core/session/create-user-session";

export const sessionCrudRouter = new Hono();

sessionCrudRouter.use("/*", authMiddleware);

sessionCrudRouter.get("/", async (c) => {
  const { username } = getAuthPayload(c);
  const search = c.req.query("search");
  const agentId = c.req.query("agentId");
  const teamId = c.req.query("teamId");
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
    teamId,
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

  try {
    const createdSessionItem = await createUserSession({
      username,
      name: data.name,
      projectId: data.projectId,
      agentId: data.agentId,
      teamId: data.teamId,
    });
    return c.json(createdSessionItem, 201);
  } catch (err) {
    if (err instanceof SessionDomainError) {
      return c.json({ error: err.message }, err.statusCode as any);
    }
    console.error("[SessionCrudRouter] Failed to create session:", err);
    return c.json({ error: "Failed to create session" }, 500);
  }
});

sessionCrudRouter.delete("/:id", async (c) => {
  const { username } = getAuthPayload(c);
  const id = c.req.param("id");
  await sessionManager.destroySession(username, id);
  return c.json({ success: true });
});

sessionCrudRouter.get("/:id/config", async (c) => {
  const { username } = getAuthPayload(c);
  const id = c.req.param("id");
  const { sessionMetadataStore } = await import("../../core/session/metadata-store");
  const { cascadeConfigLoader } = await import("../../core/config");

  const meta = sessionMetadataStore.getSessionMetadata(username, id);
  const resolved = await cascadeConfigLoader.load(username, {
    agentId: meta?.agentId,
    projectId: meta?.projectId,
    teamId: meta?.teamId,
  });
  return c.json(resolved);
});
