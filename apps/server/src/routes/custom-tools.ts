// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import { CustomToolStorage } from "../core/custom-tools/storage";
import { authMiddleware, getAuthPayload } from "../middleware/auth";

export const customToolsRouter = new Hono();

customToolsRouter.use("/*", authMiddleware);

customToolsRouter.get("/", async (c) => {
  const { username } = getAuthPayload(c);
  const storage = new CustomToolStorage();
  const tools = storage.loadAll(username);

  const summaries = tools.map((t: any) => ({
    name: t.name,
    label: t.label,
    description: t.description,
    enabled: t.enabled,
    executeType: t.execute?.type ?? "ui",
    dependencies: t.dependencies,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  return c.json(summaries);
});
