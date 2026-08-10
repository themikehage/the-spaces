// SPDX-License-Identifier: MIT
import { existsSync, readFileSync } from "node:fs";
import type { WSContext } from "hono/ws";
import { SessionPrefix, getSessionMetadataPath } from "shared";
import type { ISessionManager } from "../../core/ports/core-services.port";
import { ensureWatcher, setBuilding, setError, setReady } from "../../core/preview/preview-watcher";
import type { AuthPayload } from "../../middleware/auth";
import { wsLogger } from "../logger";
import { wsRegistry } from "../registry";

function getProjectNameForSession(username: string, sessionId: string): string | undefined {
  const p = getSessionMetadataPath(username, sessionId);
  if (existsSync(p)) {
    try {
      const meta = JSON.parse(readFileSync(p, "utf-8"));
      return meta.projectId ?? meta.projectName;
    } catch {
      /* noop */
    }
  }
}

export function safeSend(ws: { send: (data: string) => void }, data: string): void {
  try {
    ws.send(data);
  } catch (err) {
    wsLogger.error("safeSend failed", { error: err });
  }
}

export async function subscribeWsToSession(
  wsId: string,
  ws: WSContext,
  user: AuthPayload,
  sessionId: string,
  sessionManager: ISessionManager,
): Promise<void> {
  if (sessionId.startsWith(SessionPrefix.EXEC)) {
    return;
  }

  wsRegistry.clearUnsub(wsId);

  const meta = wsRegistry.getMeta(wsId);
  if (meta?.teamId) {
    wsRegistry.removeTeamSocket(meta.teamId, ws);
    wsRegistry.updateMeta(wsId, { teamId: undefined });
  }
  if (meta?.sessionId && meta.sessionId !== sessionId) {
    wsRegistry.removeSessionSocket(meta.sessionId, ws);
  }

  wsRegistry.addSessionSocket(sessionId, ws);
  wsRegistry.updateMeta(wsId, { sessionId });

  const session = await sessionManager.getOrCreateSession(user.username, sessionId);

  const BUILD_REGEX =
    /\b(build|vite build|next build|nuxt build|astro build|bun run build|npm run build|pnpm run build|yarn build|tsc|webpack|parcel build|rollup -c)\b/;
  const sessionProjectName = getProjectNameForSession(user.username, sessionId);
  let hadBuildInSession = false;

  const unsub = session.subscribe((agentEvent) => {
    const eventWithEnvelope =
      typeof agentEvent === "object" && agentEvent !== null && !("sessionId" in agentEvent)
        ? { ...agentEvent, sessionId }
        : agentEvent;
    safeSend(ws, JSON.stringify(eventWithEnvelope));

    if (agentEvent.type === "tool_execution_start") {
      const ev = agentEvent as any;
      const cmd = ev.args?.command as string | undefined;
      if (ev.toolName === "bash" && cmd && BUILD_REGEX.test(cmd) && sessionProjectName) {
        hadBuildInSession = true;
        setBuilding(user.username, sessionProjectName);
      }
    }

    if (agentEvent.type === "tool_execution_end") {
      const ev = agentEvent as any;
      if (ev.toolName === "bash" && sessionProjectName) {
        const cmd = ev.args?.command as string | undefined;
        if (ev.isError) {
          const resultStr =
            typeof ev.result === "string" ? ev.result : JSON.stringify(ev.result).slice(0, 500);
          setError(user.username, sessionProjectName, resultStr || "Build failed");
          hadBuildInSession = false;
        } else if (cmd && BUILD_REGEX.test(cmd)) {
          hadBuildInSession = false;
          setReady(user.username, sessionProjectName);
        }
      }
    }

    if (agentEvent.type === "agent_end" && sessionProjectName && hadBuildInSession) {
      ensureWatcher(user.username, sessionProjectName);
      hadBuildInSession = false;
    }

    const sendContextUsage = () => {
      try {
        const contextUsage = session.getContextUsage();
        const sessionStats = session.getSessionStats();
        if (contextUsage || sessionStats) {
          safeSend(
            ws,
            JSON.stringify({
              type: "context_usage",
              sessionId,
              contextUsage,
              sessionStats,
            }),
          );
        }
      } catch (err) {
        wsLogger.error("sendContextUsage callback failed", {
          wsId,
          error: err,
        });
      }
    };

    if (agentEvent.type === "agent_start") {
      const sockets = wsRegistry.userSockets.get(user.username);
      if (sockets) {
        const payload = JSON.stringify({
          type: "session_status",
          sessionId,
          status: "streaming",
          state: "running",
        });
        for (const s of sockets) {
          try {
            s.send(payload);
          } catch {
            /* noop */
          }
        }
      }
      sendContextUsage();
    }
    if (agentEvent.type === "agent_end") {
      const sockets = wsRegistry.userSockets.get(user.username);
      if (sockets) {
        const payload = JSON.stringify({
          type: "session_status",
          sessionId,
          status: "sleeping",
          state: "idle",
        });
        for (const s of sockets) {
          try {
            s.send(payload);
          } catch {
            /* noop */
          }
        }
      }
      sendContextUsage();
    }
    if (agentEvent.type === "message_end") {
      sendContextUsage();
    }
  });

  wsRegistry.setUnsub(wsId, unsub);

  if (session.isStreaming) {
    safeSend(ws, JSON.stringify({ type: "agent_start" }));
  }

  try {
    const contextUsage = session.getContextUsage();
    const sessionStats = session.getSessionStats();
    if (contextUsage || sessionStats) {
      safeSend(
        ws,
        JSON.stringify({
          type: "context_usage",
          sessionId,
          contextUsage,
          sessionStats,
        }),
      );
    }
  } catch (err) {
    wsLogger.error("subscribeWsToSession initial sendContextUsage failed", {
      wsId,
      error: err,
    });
  }
}
