// SPDX-License-Identifier: MIT
import type { WSContext, WSMessageReceive } from "hono/ws";
import { WS_PROTOCOL_VERSION, WsClientMessageSchema } from "shared";
import { createServerContext, type ServerContext } from "../core/infra/server-context";
import {
  resolveUsernameFromCookieHeader,
  resolveUsernameFromToken,
  validateSessionFromHeaders,
} from "../lib/auth-helpers";
import type { AuthPayload } from "../middleware/auth";

import { dispatchWsMessage } from "./handlers/message-dispatcher";
import { wsLogger } from "./logger";
import { wsRegistry } from "./registry";
import { safeSend, subscribeWsToSession } from "./subscriptions/session-subscription";

export interface WsConnectionContext {
  id: string;
  onOpen: (evt: Event, ws: WSContext, rawHeaders?: Headers | null) => Promise<void> | void;
  onMessage: (evt: MessageEvent<WSMessageReceive>, ws: WSContext) => Promise<void> | void;
  onClose: (evt: any, ws: WSContext) => void;
  getId: () => string;
}

export function createWsContext(serverContext?: ServerContext): WsConnectionContext {
  const ctx = serverContext ?? createServerContext();
  const sessionManager = ctx.sessionManager;
  const uiApprovalRegistry = ctx.uiApprovalRegistry;
  const approvalManager = ctx.approvalManager;
  const id = crypto.randomUUID();

  const onOpen = async (_evt: Event, ws: WSContext, rawHeaders?: Headers | null) => {
    wsRegistry.createMeta(id, ws);
    wsLogger.info("Connection opened", { wsId: id });

    try {
      if (!rawHeaders) {
        return;
      }

      const headersForValidation =
        rawHeaders instanceof Headers ? rawHeaders : new Headers(rawHeaders as any);
      let username: string | null = null;

      try {
        const validated = await validateSessionFromHeaders(headersForValidation);
        if (validated?.username) {
          username = validated.username;
        }
      } catch {
        /* noop */
      }

      if (!username) {
        const cookieHeader =
          headersForValidation.get("Cookie") ?? headersForValidation.get("cookie") ?? null;
        if (cookieHeader) {
          username = resolveUsernameFromCookieHeader(cookieHeader);
        }
      }

      if (username) {
        wsLogger.info("Cookie auth success", { wsId: id, username });
        const user: AuthPayload = { username };
        wsRegistry.setUser(id, user);
        wsRegistry.addUserSocket(user.username, ws);
        safeSend(ws, JSON.stringify({ type: "auth_success", wsId: id }));
      }
    } catch (err) {
      wsLogger.error("Cookie auth error", { wsId: id, error: err });
    }
  };

  const onClose = (evt: any, _ws: WSContext) => {
    wsLogger.info(`Connection closed code=${evt?.code} reason=${evt?.reason ?? ""}`, {
      wsId: id,
    });
    const meta = wsRegistry.getMeta(id);
    const user = meta?.user ?? wsRegistry.getUser(id);

    if (user) {
      wsRegistry.removeUserSocket(user.username, meta?.ws ?? _ws);
    }

    if (meta?.sessionId) {
      wsRegistry.removeSessionSocket(meta.sessionId, meta.ws ?? _ws);
    }

    if (meta?.teamId) {
      wsRegistry.removeTeamSocket(meta.teamId, meta.ws ?? _ws);
    }

    wsRegistry.deleteMeta(id);
  };

  const onMessage = async (evt: MessageEvent<WSMessageReceive>, ws: WSContext) => {
    if (typeof evt.data !== "string") return;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(evt.data);
    } catch {
      return;
    }

    const parsed = WsClientMessageSchema.safeParse(data);
    if (!parsed.success) {
      wsLogger.warn(`Invalid WS message received from wsId=${id}`);
      safeSend(
        ws,
        JSON.stringify({
          type: "error",
          error: "Invalid message",
          code: "WS_INVALID_MESSAGE",
        }),
      );
      return;
    }

    try {
      if (data.type === "pong") {
        const meta = wsRegistry.getMeta(id);
        if (meta) {
          meta.missedPings = 0;
        }
        return;
      }

      if (data.type === "auth") {
        const sessionToken = (data.token as string) || "";
        if (process.env.SPACES_DEBUG_AUTH === "1") {
          wsLogger.info(
            `Auth request token prefix: ${sessionToken ? sessionToken.slice(0, 8) : "none"}...`,
            { wsId: id },
          );
        }

        try {
          let username: string | null = null;
          if (sessionToken) {
            username = resolveUsernameFromToken(sessionToken);
          }

          if (!username) {
            wsLogger.warn("Auth failed - session token not found or expired", { wsId: id });
            const existingUser = wsRegistry.getUser(id);
            if (!existingUser) {
              safeSend(ws, JSON.stringify({ type: "auth_error", error: "Invalid session" }));
              try {
                ws.close();
              } catch {
                /* noop */
              }
            }
            return;
          }

          wsLogger.info("Auth success", { wsId: id, username });
          const user: AuthPayload = { username };
          wsRegistry.setUser(id, user);
          wsRegistry.addUserSocket(user.username, ws);

          const sessionId = data.sessionId as string;
          if (sessionId) {
            wsLogger.info(`Auto-subscribing to sessionId: ${sessionId}`, { wsId: id });
            await subscribeWsToSession(id, ws, user, sessionId, sessionManager);
          }

          safeSend(
            ws,
            JSON.stringify({
              type: "auth_success",
              wsId: id,
              protocolVersion: WS_PROTOCOL_VERSION,
            }),
          );
        } catch (err: any) {
          wsLogger.error("Auth exception", { wsId: id, error: err });
          const existingUser = wsRegistry.getUser(id);
          if (!existingUser) {
            safeSend(ws, JSON.stringify({ type: "auth_error", error: "Invalid session" }));
            try {
              ws.close();
            } catch {
              /* noop */
            }
          }
        }
        return;
      }

      const user = wsRegistry.getUser(id);
      if (!user) {
        wsLogger.warn(`Message type=${data.type} from unauthenticated`, { wsId: id });
        safeSend(ws, JSON.stringify({ type: "error", error: "Not authenticated" }));
        return;
      }

      await dispatchWsMessage(id, ws, user, data, sessionManager, uiApprovalRegistry, approvalManager);
    } catch (err) {
      wsLogger.error(`onMessage exception type=${(data as any)?.type}`, {
        wsId: id,
        error: err,
      });
      try {
        safeSend(
          ws,
          JSON.stringify({
            type: "agent_error",
            error: String(err),
            sessionId: (data as any)?.sessionId,
          }),
        );
      } catch {
        /* noop */
      }
    }
  };

  return {
    id,
    onOpen,
    onMessage,
    onClose,
    getId: () => id,
  };
}
