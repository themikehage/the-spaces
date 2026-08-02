// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import type { AppContext } from "../../context";
import { sessionsRouter as legacySessionsRouter } from "../sessions";
import { createEngineSessionCrudRouter } from "./engine-session-crud";
import { sessionCrudRouter as defaultSessionCrudRouter } from "./session-crud";

export function createSessionsRouter(appContext?: AppContext): Hono {
  const router = new Hono();

  if (appContext) {
    router.route("/v2", createEngineSessionCrudRouter(appContext));
  }

  router.route("/", defaultSessionCrudRouter);
  router.route("/", legacySessionsRouter);

  return router;
}

export const sessionsRouter = createSessionsRouter();
