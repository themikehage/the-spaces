// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import { jobsCrudRouter } from "./jobs-crud";
import { runsCrudRouter } from "./runs-crud";

export const schedulesRouter = new Hono();

schedulesRouter.route("/", jobsCrudRouter);
schedulesRouter.route("/", runsCrudRouter);
