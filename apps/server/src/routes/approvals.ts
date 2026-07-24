// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { approvalManager } from "../core/approvals/approval-manager";
import { uiApprovalRegistry } from "../core/ui-approval-registry";
import { authMiddleware, getAuthPayload } from "../middleware/auth";

export const approvalsRouter = new Hono();

approvalsRouter.use("/*", authMiddleware);

approvalsRouter.get("/", async (c) => {
  const { username } = getAuthPayload(c);
  const securityApprovals = approvalManager.getAll(username).map((a) => ({
    ...a,
    type: "approval" as const,
  }));
  const questionActions = uiApprovalRegistry.getAll(username).map((q) => ({
    ...q,
    type: "question" as const,
  }));
  return c.json({ pending: [...securityApprovals, ...questionActions] });
});

const ResolveApprovalSchema = z.object({
  action: z.enum(["approve", "deny", "submit", "cancel", "confirm"]),
  payload: z.record(z.any()).optional(),
});

approvalsRouter.post("/:id", zValidator("json", ResolveApprovalSchema), async (c) => {
  const { id } = c.req.param();
  const { action, payload } = c.req.valid("json");
  const success =
    approvalManager.resolve(id, { action: action as any, payload }) ||
    uiApprovalRegistry.resolve(id, { action, payload });

  if (success) {
    return c.json({ success: true });
  } else {
    return c.json({ error: "Approval request not found or already completed" }, 404);
  }
});
