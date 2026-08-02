// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { SetEnvVarSchema } from "@spaces/core";
import { Hono } from "hono";
import { z } from "zod";
import type { AppContext } from "../context";
import { auditLog } from "../core/audit-log";
import { authMiddleware, getAuthPayload } from "../middleware/auth";

export const envRouter = new Hono<{ Variables: { appContext: AppContext } }>();

envRouter.use("/*", authMiddleware);

envRouter.get("/", (c) => {
  const { username } = getAuthPayload(c);
  const { userConfigManager } = c.get("appContext");
  const userEnv = userConfigManager.getUserEnv(username);

  const envList = Object.entries(userEnv).map(([key]) => ({
    key,
    value: "••••••••",
  }));

  return c.json({ env: envList });
});

envRouter.get("/reveal/:key", (c) => {
  const key = c.req.param("key").trim().toUpperCase();
  const { username } = getAuthPayload(c);
  const { userConfigManager } = c.get("appContext");
  const userEnv = userConfigManager.getUserEnv(username);

  if (!(key in userEnv)) {
    return c.json({ error: "Variable not found" }, 404);
  }

  auditLog(username, "env_reveal", { key });

  return c.json({ key, value: userEnv[key] });
});

envRouter.post("/", zValidator("json", SetEnvVarSchema), (c) => {
  const { key, value } = c.req.valid("json");
  const { username } = getAuthPayload(c);
  const { userConfigManager } = c.get("appContext");

  userConfigManager.setUserEnv(username, key.trim(), value);

  return c.json({ success: true, key, value: "••••••••" });
});

envRouter.put(
  "/",
  zValidator(
    "json",
    z.object({
      variables: z.record(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/), z.string()),
    }),
  ),
  (c) => {
    const { variables } = c.req.valid("json");
    const { username } = getAuthPayload(c);
    const { userConfigManager } = c.get("appContext");
    const current = userConfigManager.getUserEnv(username);
    const updated: Record<string, string> = {};

    for (const [key, value] of Object.entries(variables)) {
      const formattedKey = key.trim().toUpperCase();
      if (value === "••••••••") {
        if (current[formattedKey]) {
          updated[formattedKey] = current[formattedKey];
        }
      } else {
        updated[formattedKey] = value;
      }
    }

    userConfigManager.setUserEnvMap(username, updated);

    const envList = Object.entries(updated).map(([k]) => ({
      key: k,
      value: "••••••••",
    }));

    return c.json({ success: true, env: envList });
  },
);

envRouter.delete("/:key", (c) => {
  const key = c.req.param("key");
  const { username } = getAuthPayload(c);
  const { userConfigManager } = c.get("appContext");

  userConfigManager.deleteUserEnv(username, key);

  return c.json({ success: true });
});
