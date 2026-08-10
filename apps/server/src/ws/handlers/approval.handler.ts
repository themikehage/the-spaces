import type { WSContext } from "hono/ws";
import type { IApprovalManager, IUiApprovalRegistry } from "../../core/ports/core-services.port";
import type { AuthPayload } from "../../middleware/auth";
import { safeSend } from "../subscriptions/session-subscription";

export async function handleApprovalWsMessage(
  ws: WSContext,
  user: AuthPayload,
  data: Record<string, unknown>,
  uiApprovalRegistry: IUiApprovalRegistry,
  approvalManager: IApprovalManager,
): Promise<boolean> {
  if (data.type === "approvals_get") {
    const pending = approvalManager.getAll(user.username);
    safeSend(ws, JSON.stringify({ type: "approvals_pending", items: pending }));
    return true;
  }

  if (data.type === "ui_action") {
    const componentId = data.componentId as string;
    const action = data.action as string;
    const payload = data.payload as Record<string, any> | undefined;
    if (componentId && action) {
      const mappedAction =
        action === "confirm" ? "approve" : action === "deny" ? "deny" : action;
      const resolved =
        uiApprovalRegistry.resolve(componentId, { action, payload }) ||
        approvalManager.resolve(componentId, { action: mappedAction as any, payload });
      if (resolved) {
        safeSend(ws, JSON.stringify({ type: "ui_action_acknowledged", componentId }));
      } else {
        safeSend(
          ws,
          JSON.stringify({
            type: "ui_action_error",
            componentId,
            error: "Approval request not found or already completed",
          }),
        );
      }
    }
    return true;
  }

  return false;
}
