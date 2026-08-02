// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import type { AppContext } from "../../context";
import { createEngineSessionCrudRouter } from "./engine-session-crud";

export function createSessionsRouter(appContext: AppContext): Hono {
  const router = new Hono();
  router.route("/", createEngineSessionCrudRouter(appContext));
  return router;
}
