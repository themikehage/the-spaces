// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import { sessionsRouter as legacySessionsRouter } from "../sessions";
import { sessionCrudRouter } from "./session-crud";

export const sessionsRouter = new Hono();

// Mount modular sub-routers
// sessionCrudRouter owns collection CRUD routes: GET /, GET /statuses, POST /, DELETE /:id
sessionsRouter.route("/", sessionCrudRouter);
// legacySessionsRouter owns session sub-resources: prompt, SSE, analytics, tools, delegations
sessionsRouter.route("/", legacySessionsRouter);
