// SPDX-License-Identifier: MIT
import type { WSContext } from "hono/ws";
import type { AuthPayload } from "../../middleware/auth";
import { teamOrchestrator } from "../../teams";
import { wsLogger } from "../logger";
import { wsRegistry } from "../registry";
import { safeSend } from "../subscriptions/session-subscription";

export async function handleTeamWsMessage(
  id: string,
  ws: WSContext,
  user: AuthPayload,
  data: Record<string, unknown>,
): Promise<boolean> {
  if (data.type === "team_join") {
    const teamId = data.teamId as string;
    if (!teamId) return true;

    wsRegistry.clearUnsub(id);

    const meta = wsRegistry.getMeta(id);
    if (meta?.sessionId) {
      wsRegistry.removeSessionSocket(meta.sessionId, ws);
      wsRegistry.updateMeta(id, { sessionId: undefined });
    }
    if (meta?.teamId && meta.teamId !== teamId) {
      wsRegistry.removeTeamSocket(meta.teamId, ws);
    }
    wsRegistry.updateMeta(id, { teamId });
    wsRegistry.addTeamSocket(teamId, ws);
    safeSend(ws, JSON.stringify({ type: "team_joined", teamId }));
    return true;
  }

  if (data.type === "team_send") {
    const teamId = data.teamId as string;
    const message = data.message as string;
    const sessionId = data.sessionId as string | undefined;
    if (teamId && message) {
      teamOrchestrator
        .dispatchUserMessage(user.username, teamId, message, sessionId)
        .catch((err) => {
          wsLogger.error("Error dispatching team message", { error: err });
        });
    }
    return true;
  }

  if (data.type === "team_abort") {
    const teamId = data.teamId as string;
    const sessionId = data.sessionId as string | undefined;
    if (teamId) {
      teamOrchestrator.abortDispatch(user.username, teamId, sessionId);
    }
    return true;
  }

  return false;
}
