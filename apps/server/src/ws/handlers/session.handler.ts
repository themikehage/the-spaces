import type { WSContext } from "hono/ws";
import { DEFAULT_ALWAYS_ON_TOOLS, SessionPrefix } from "shared";
import type { IApprovalManager, ISessionManager, IUiApprovalRegistry } from "../../core/ports/core-services.port";
import type { AuthPayload } from "../../middleware/auth";
import { wsLogger } from "../logger";
import { wsRegistry } from "../registry";
import { safeSend, subscribeWsToSession } from "../subscriptions/session-subscription";

export async function handleSessionWsMessage(
  id: string,
  ws: WSContext,
  user: AuthPayload,
  data: Record<string, unknown>,
  sessionManager: ISessionManager,
  uiApprovalRegistry?: IUiApprovalRegistry,
  approvalManager?: IApprovalManager,
): Promise<boolean> {
  if (data.type === "session_subscribe") {
    const sessionId = data.sessionId as string;
    if (!sessionId) return true;
    wsLogger.info(`session_subscribe session=${sessionId}`, {
      wsId: id,
      username: user.username,
    });
    await subscribeWsToSession(id, ws, user, sessionId, sessionManager);
    safeSend(ws, JSON.stringify({ type: "session_subscribed", sessionId }));
    return true;
  }

  if (data.type === "session_unsubscribe") {
    const sessionId = data.sessionId as string;
    if (!sessionId) return true;
    wsLogger.info(`session_unsubscribe session=${sessionId}`, {
      wsId: id,
      username: user.username,
    });
    const meta = wsRegistry.getMeta(id);
    if (meta?.sessionId === sessionId) {
      wsRegistry.clearUnsub(id);
      wsRegistry.removeSessionSocket(sessionId, ws);
      wsRegistry.updateMeta(id, { sessionId: undefined });
    }
    safeSend(ws, JSON.stringify({ type: "session_unsubscribed", sessionId }));
    return true;
  }

  if (data.type === "prompt") {
    const sessionId = data.sessionId as string;
    const message = data.message as string;
    const tools = data.tools as string[] | undefined;
    const images = data.images as any[] | undefined;

    wsLogger.info(`prompt session=${sessionId} len=${message?.length ?? 0}`, {
      wsId: id,
      username: user.username,
    });

    if (sessionId && sessionId.startsWith(SessionPrefix.EXEC)) {
      safeSend(
        ws,
        JSON.stringify({
          type: "agent_error",
          sessionId,
          error: "Execution sessions are read-only and do not accept prompts.",
          code: "SESSION_READONLY",
        }),
      );
      return true;
    }

    try {
      const existingMeta = wsRegistry.getMeta(id);
      if (!existingMeta?.sessionId || existingMeta.sessionId !== sessionId) {
        wsLogger.info(`Auto-subscribing on prompt session=${sessionId}`, { wsId: id });
        await subscribeWsToSession(id, ws, user, sessionId, sessionManager);
      }
    } catch (e) {
      wsLogger.error("Failed to auto-subscribe on prompt", { wsId: id, error: e });
    }

    const session = await sessionManager.getOrCreateSession(user.username, sessionId);

    try {
      const { resolveCustomToolsForSession } = await import("../../core/custom-tools/resolver");
      const resolvedBaseTools = await resolveCustomToolsForSession({
        username: user.username,
        context: {
          cwd: (session as any).cwd || process.cwd(),
          session: session as any,
          username: user.username,
          sessionId,
        },
      });

      if (resolvedBaseTools.length > 0) {
        (session as any).customTools = resolvedBaseTools;
        (session as any)._customTools = resolvedBaseTools;
        if (typeof (session as any)._refreshToolRegistry === "function") {
          (session as any)._refreshToolRegistry();
        }
      }
    } catch (err) {
      console.error("[SessionHandler] Error refreshing custom tools for session:", err);
    }

    if (tools && Array.isArray(tools)) {
      const currentActive = session.getActiveToolNames();

      const ALWAYS_ON = DEFAULT_ALWAYS_ON_TOOLS;
      const BUILTIN_AND_ALWAYS = new Set<string>([
        "read",
        "write",
        "edit",
        "bash",
        "grep",
        "find",
        "ls",
        "exa_search",
        "web_fetch",
        "render_html",
        ...ALWAYS_ON,
        "memory_store",
        "memory_recall",
        "memory_forget",
        "manage_preview",
      ]);

      const mcpActive = currentActive.filter((tName: string) => tName.startsWith("mcp_"));
      const memoryActive = currentActive.filter((tName: string) => tName.startsWith("memory_"));
      const exaActive = currentActive.filter((tName: string) => tName === "exa_search");
      const webFetchActive = currentActive.filter((tName: string) => tName === "web_fetch");
      const customActive = currentActive.filter(
        (tName: string) =>
          !tName.startsWith("mcp_") &&
          !tName.startsWith("memory_") &&
          !BUILTIN_AND_ALWAYS.has(tName),
      );

      const enabledCustomFromStorage = (session as any).customTools?.map((t: any) => t.name) ?? [];
      const mergedCustom = Array.from(new Set([...customActive, ...enabledCustomFromStorage]));

      session.setActiveToolsByName(
        Array.from(
          new Set([
            ...tools,
            ...mcpActive,
            ...memoryActive,
            ...exaActive,
            ...webFetchActive,
            ...mergedCustom,
            ...ALWAYS_ON,
          ]),
        ),
      );
    }

    if (session.isStreaming) {
      try {
        session.followUp(message);
      } catch (error) {
        safeSend(ws, JSON.stringify({ type: "agent_error", sessionId, error: String(error) }));
      }
      return true;
    }

    const { modelRegistry } = sessionManager.userConfig.getUserContext(user.username);
    if (!session.model || !modelRegistry.hasConfiguredAuth(session.model)) {
      const available = modelRegistry.getAvailable();
      if (available.length > 0) {
        try {
          await session.setModel(available[0]);
        } catch (error) {
          safeSend(
            ws,
            JSON.stringify({ type: "agent_error", sessionId, error: String(error) }),
          );
          return true;
        }
      } else {
        safeSend(
          ws,
          JSON.stringify({
            type: "agent_error",
            sessionId,
            error: "No providers configured. Go to Settings to add an API key.",
          }),
        );
        return true;
      }
    }

    try {
      await session.prompt(message, { images });
    } catch (error) {
      safeSend(ws, JSON.stringify({ type: "agent_error", sessionId, error: String(error) }));
    }
    return true;
  }

  if (data.type === "steer") {
    const sessionId = data.sessionId as string;
    const message = data.message as string;
    const session = sessionManager.getSession(user.username, sessionId);
    if (session) {
      const steerMsg = message.startsWith("[Steer] ") ? message : `[Steer] ${message}`;
      session.steer(steerMsg);
    }
    return true;
  }

  if (data.type === "follow_up") {
    const sessionId = data.sessionId as string;
    const message = data.message as string;
    const session = sessionManager.getSession(user.username, sessionId);
    if (session) {
      const followUpMsg = message.startsWith("[Follow-up] ")
        ? message
        : `[Follow-up] ${message}`;
      session.followUp(followUpMsg);
    }
    return true;
  }

  if (data.type === "abort") {
    const sessionId = data.sessionId as string;

    // Always cancel registries unconditionally — session may not be in memory
    // but orphan items must still be cleared from both registries
    try {
      uiApprovalRegistry?.cancelSession?.(sessionId);
    } catch { /* ignore */ }
    try {
      approvalManager?.cancelSession(sessionId);
    } catch { /* ignore */ }

    const session = sessionManager.getSession(user.username, sessionId);
    if (session) {
      await session.abort();
    }
    safeSend(ws, JSON.stringify({ type: "aborted", sessionId }));
    return true;
  }

  if (data.type === "compact") {
    const sessionId = data.sessionId as string;
    const session = sessionManager.getSession(user.username, sessionId);
    if (session) await session.compact();
    return true;
  }

  if (data.type === "get_context_usage") {
    const sessionId = data.sessionId as string;
    const session = sessionManager.getSession(user.username, sessionId);
    if (session) {
      const contextUsage = session.getContextUsage();
      const sessionStats = session.getSessionStats();
      const state = session.isStreaming ? "running" : "idle";
      safeSend(
        ws,
        JSON.stringify({
          type: "session_status",
          sessionId,
          status: session.isStreaming ? "streaming" : "sleeping",
          state,
        }),
      );
      safeSend(
        ws,
        JSON.stringify({ type: "context_usage", sessionId, contextUsage, sessionStats }),
      );
    }
    return true;
  }

  return false;
}
