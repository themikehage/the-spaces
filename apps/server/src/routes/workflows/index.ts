// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import { workflowCrudRouter } from "./workflow-crud";
import { workflowRunsRouter } from "./workflow-runs";

export const workflowsRouter = new Hono();

workflowsRouter.route("/", workflowCrudRouter);
workflowsRouter.route("/", workflowRunsRouter);
