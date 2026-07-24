// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ResolveAttentionSchema } from "shared";
import { approvalManager } from "../core/approvals/approval-manager";
import { sessionMetadataStore } from "../core/session/metadata-store";
import { uiApprovalRegistry } from "../core/ui-approval-registry";
import { authMiddleware, getAuthPayload } from "../middleware/auth";

export const approvalsRouter = new Hono();

approvalsRouter.use("/*", authMiddleware);

function enrichItem(username: string, item: any) {
  const meta = item.sessionId
    ? sessionMetadataStore.getSessionMetadata(username, item.sessionId)
    : null;
  return {
    ...item,
    projectId: item.projectId ?? meta?.projectId ?? meta?.projectName,
    agentId: item.agentId ?? meta?.agentId,
    teamId: item.teamId ?? meta?.teamId,
  };
}

approvalsRouter.get("/", async (c) => {
  const { username } = getAuthPayload(c);
  const securityApprovals = approvalManager.getAll(username).map((a) => {
    const kind = "approval" as const;
    return enrichItem(username, {
      ...a,
      kind,
      type: kind,
    });
  });
  const questionActions = uiApprovalRegistry.getAll(username).map((q) => {
    const kind = q.type === "ui_action" ? ("ui_action" as const) : ("question" as const);
    return enrichItem(username, {
      ...q,
      kind,
      type: kind,
    });
  });
  return c.json({ pending: [...securityApprovals, ...questionActions] });
});

approvalsRouter.post("/:id", zValidator("json", ResolveAttentionSchema), async (c) => {
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
