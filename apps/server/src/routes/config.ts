// SPDX-License-Identifier: MIT
import {
  EntityConfigSchema,
  EntityTypeSchema,
  getAgentWorkspaceDir,
  getProjectWorkspaceDir,
  getTeamWorkspaceDir,
  getWorkspaceDir,
} from "@spaces/core";
import { Hono } from "hono";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AppContext } from "../context";
import { authMiddleware, getAuthPayload } from "../middleware/auth";

export const configRouter = new Hono<{ Variables: { appContext: AppContext } }>();

configRouter.use("/*", authMiddleware);

function resolveTargetWorkspace(
  username: string,
  entityType: string,
  entityId: string,
): string | null {
  if (entityType === "global") return getWorkspaceDir(username);
  if (entityType === "agent") return getAgentWorkspaceDir(username, entityId);
  if (entityType === "project") return getProjectWorkspaceDir(username, entityId);
  if (entityType === "team") return getTeamWorkspaceDir(username, entityId);
  return null;
}

configRouter.get("/:entityType/:entityId", async (c) => {
  const { username } = getAuthPayload(c);
  const entityType = c.req.param("entityType");
  const entityId = c.req.param("entityId");

  const parsedType = EntityTypeSchema.safeParse(entityType);
  if (!parsedType.success) {
    return c.json({ error: "Invalid entity type" }, 400);
  }

  const workspaceDir = resolveTargetWorkspace(username, entityType, entityId);
  if (!workspaceDir) {
    return c.json({ error: "Invalid target entity" }, 400);
  }

  const { workspaceConfigLoader } = c.get("appContext");
  const config = await workspaceConfigLoader.load(workspaceDir);
  return c.json(config ?? {});
});

configRouter.put("/:entityType/:entityId", async (c) => {
  const { username } = getAuthPayload(c);
  const entityType = c.req.param("entityType");
  const entityId = c.req.param("entityId");

  const parsedType = EntityTypeSchema.safeParse(entityType);
  if (!parsedType.success) {
    return c.json({ error: "Invalid entity type" }, 400);
  }

  const workspaceDir = resolveTargetWorkspace(username, entityType, entityId);
  if (!workspaceDir) {
    return c.json({ error: "Invalid target entity" }, 400);
  }

  try {
    const rawBody = await c.req.json();
    const parsed = EntityConfigSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: "Invalid config payload", details: parsed.error.format() }, 400);
    }

    const dotSpacesDir = join(workspaceDir, ".spaces");
    if (!existsSync(dotSpacesDir)) {
      mkdirSync(dotSpacesDir, { recursive: true });
    }

    const configPath = join(dotSpacesDir, "config.json");
    writeFileSync(configPath, JSON.stringify(parsed.data, null, 2), "utf-8");

    return c.json({ success: true, config: parsed.data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to save entity config";
    return c.json({ error: message }, 500);
  }
});

configRouter.get("/:entityType/:entityId/resolved", async (c) => {
  const { username } = getAuthPayload(c);
  const entityType = c.req.param("entityType");
  const entityId = c.req.param("entityId");

  const parsedType = EntityTypeSchema.safeParse(entityType);
  if (!parsedType.success) {
    return c.json({ error: "Invalid entity type" }, 400);
  }

  const entityRef =
    entityType === "agent"
      ? { agentId: entityId }
      : entityType === "project"
        ? { projectId: entityId }
        : entityType === "team"
          ? { teamId: entityId }
          : {};

  const { cascadeConfigLoader } = c.get("appContext");
  const resolved = await cascadeConfigLoader.load(username, entityRef);
  return c.json(resolved);
});
