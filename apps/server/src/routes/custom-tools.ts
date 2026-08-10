// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EntityTypeSchema, UpsertFolderCustomToolSchema } from "shared";
import { z } from "zod";
import { cascadeConfigLoader } from "../core/config";
import { CustomToolDefinitionSchema } from "../core/custom-tools/schemas";
import { NotFoundError } from "../core/infra/errors";
import { authMiddleware, getAuthPayload } from "../middleware/auth";

export const customToolsRouter = new Hono();

customToolsRouter.use("/*", authMiddleware);

customToolsRouter.get("/", (c) => {
  const { username } = getAuthPayload(c);
  const { customToolProvider } = c.get("serverContext");
  const tools = customToolProvider.loadAll(username);

  const summaries = tools.map((t) => ({
    name: t.definition.name,
    label: t.definition.label,
    description: t.definition.description,
    enabled: t.definition.enabled,
    executeType: t.definition.execute?.type ?? "ui",
    dependencies: t.definition.dependencies,
    requiresApproval: t.definition.requiresApproval,
    hasUi: t.hasUi,
    hasScripts: t.hasScripts,
    createdAt: t.definition.createdAt,
    updatedAt: t.definition.updatedAt,
  }));

  return c.json(summaries);
});

customToolsRouter.get("/scope/entity", zValidator("query", z.object({
  entityType: EntityTypeSchema.optional().default("global"),
  entityId: z.string().optional().default(""),
})), async (c) => {
  const { username } = getAuthPayload(c);
  const { entityType, entityId } = c.req.valid("query");
  const resolvedConfig = await cascadeConfigLoader.load(username, { type: entityType as any, id: entityId });
  return c.json(resolvedConfig);
});

customToolsRouter.get("/:name", (c) => {
  const { username } = getAuthPayload(c);
  const { customToolProvider } = c.get("serverContext");
  const name = c.req.param("name");

  const tool = customToolProvider.get(username, name);
  if (!tool) {
    throw new NotFoundError("TOOL_NOT_FOUND", `Custom tool "${name}" not found`);
  }

  let uiHtml: string | undefined;
  if (tool.hasUi) {
    const uiPath = join(tool.toolDir, "ui", "index.html");
    if (existsSync(uiPath)) {
      uiHtml = readFileSync(uiPath, "utf8");
    }
  }

  return c.json({
    definition: tool.definition,
    instructionsMd: tool.instructionsMd,
    hasUi: tool.hasUi,
    hasScripts: tool.hasScripts,
    uiHtml,
    toolDir: tool.toolDir,
  });
});

customToolsRouter.post("/", zValidator("json", UpsertFolderCustomToolSchema), (c) => {
  const { username } = getAuthPayload(c);
  const { customToolProvider } = c.get("serverContext");
  const { definition: rawDef, instructionsMd, uiHtml } = c.req.valid("json");

  const parsedDef = CustomToolDefinitionSchema.parse(rawDef);
  customToolProvider.upsert(username, {
    definition: parsedDef,
    instructionsMd,
    hasUi: !!uiHtml,
    hasScripts: false,
    toolDir: "",
  });

  const savedTool = customToolProvider.get(username, parsedDef.name);
  if (savedTool && uiHtml !== undefined) {
    const uiDir = join(savedTool.toolDir, "ui");
    if (!existsSync(uiDir)) {
      mkdirSync(uiDir, { recursive: true });
    }
    writeFileSync(join(uiDir, "index.html"), uiHtml, "utf8");
  }

  return c.json({ success: true, name: parsedDef.name });
});

customToolsRouter.put("/:name", zValidator("json", UpsertFolderCustomToolSchema), (c) => {
  const { username } = getAuthPayload(c);
  const { customToolProvider } = c.get("serverContext");
  const name = c.req.param("name");
  const { definition: rawDef, instructionsMd, uiHtml } = c.req.valid("json");

  const existing = customToolProvider.get(username, name);
  if (!existing) {
    throw new NotFoundError("TOOL_NOT_FOUND", `Custom tool "${name}" not found`);
  }

  const parsedDef = CustomToolDefinitionSchema.parse({
    ...rawDef,
    name,
  });

  customToolProvider.upsert(username, {
    definition: parsedDef,
    instructionsMd,
    hasUi: uiHtml !== undefined ? !!uiHtml : existing.hasUi,
    hasScripts: existing.hasScripts,
    toolDir: existing.toolDir,
  });

  if (uiHtml !== undefined) {
    const uiDir = join(existing.toolDir, "ui");
    if (!existsSync(uiDir)) {
      mkdirSync(uiDir, { recursive: true });
    }
    writeFileSync(join(uiDir, "index.html"), uiHtml, "utf8");
  }

  return c.json({ success: true, name });
});

customToolsRouter.delete("/:name", (c) => {
  const { username } = getAuthPayload(c);
  const { customToolProvider } = c.get("serverContext");
  const name = c.req.param("name");

  const existing = customToolProvider.get(username, name);
  if (!existing) {
    throw new NotFoundError("TOOL_NOT_FOUND", `Custom tool "${name}" not found`);
  }

  customToolProvider.delete(username, name);
  return c.json({ success: true, name });
});
