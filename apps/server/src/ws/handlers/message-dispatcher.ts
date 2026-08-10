import type { WSContext } from "hono/ws";
import type { IApprovalManager, ISessionManager, IUiApprovalRegistry } from "../../core/ports/core-services.port";
import type { AuthPayload } from "../../middleware/auth";
import { handleApprovalWsMessage } from "./approval.handler";
import { handleSessionWsMessage } from "./session.handler";
import { handleTeamWsMessage } from "./team.handler";

export async function dispatchWsMessage(
  id: string,
  ws: WSContext,
  user: AuthPayload,
  data: Record<string, unknown>,
  sessionManager: ISessionManager,
  uiApprovalRegistry: IUiApprovalRegistry,
  approvalManager: IApprovalManager,
): Promise<void> {
  const handledSession = await handleSessionWsMessage(id, ws, user, data, sessionManager, uiApprovalRegistry, approvalManager);
  if (handledSession) return;

  const handledTeam = await handleTeamWsMessage(id, ws, user, data);
  if (handledTeam) return;

  await handleApprovalWsMessage(ws, user, data, uiApprovalRegistry, approvalManager);
}
