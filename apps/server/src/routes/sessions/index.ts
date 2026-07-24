// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import { sessionsRouter as legacySessionsRouter } from "../sessions";
import { sessionCrudRouter } from "./session-crud";

export const sessionsRouter = new Hono();

// Mount modular sub-routers
sessionsRouter.route("/", sessionCrudRouter);
sessionsRouter.route("/", legacySessionsRouter);
