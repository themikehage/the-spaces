import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig } from "./config.ts";
import { createAppContext } from "./context.ts";
import { sessionsRouter } from "./routes/sessions.ts";
import { healthRouter } from "./routes/health.ts";
import { providersRouter } from "./routes/providers.ts";
import { browserSessionsRouter } from "./routes/browser-sessions.ts";
import { wsHandler, type WsData } from "./ws/handler.ts";
import { streamWsHandler, type StreamWsData } from "./ws/stream-proxy.ts";

import type { AppContext } from "./context.ts";

const config = loadConfig();
const appCtx = createAppContext(config);

const app = new Hono<{ Variables: { ctx: AppContext } }>();

app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/*", async (c, next) => {
  c.set("ctx", appCtx);
  await next();
});

app.route("/health", healthRouter);
app.route("/sessions", sessionsRouter);
app.route("/providers", providersRouter);
app.route("/browser-sessions", browserSessionsRouter);

app.get("/ws", (c) => {
  const url = new URL(c.req.url);
  const sessionId = url.searchParams.get("sessionId");

  console.log(`[ws/route] Connection attempt for sessionId: "${sessionId}"`);

  if (!sessionId) {
    console.warn(`[ws/route] Rejected: Missing sessionId query parameter`);
    return c.json({ error: "Missing sessionId query parameter" }, 400);
  }

  const server = c.env as any;
  if (!server || typeof server.upgrade !== "function") {
    console.error(`[ws/route] Error: Server environment does not support WebSocket upgrade`);
    return c.json({ error: "WebSocket upgrade not supported in server env" }, 500);
  }

  const upgraded = server.upgrade(c.req.raw, {
    data: { sessionId, ctx: appCtx },
  });

  if (!upgraded) {
    console.error(`[ws/route] Upgrade failed for sessionId: "${sessionId}"`);
    return c.json({ error: "WebSocket upgrade failed" }, 500);
  }

  console.log(`[ws/route] Upgrade HTTP -> WS successful for sessionId: "${sessionId}"`);
  return new Response(null);
});

// Browser stream proxy: relays agent-browser viewport frames to client viewers
app.get("/stream/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  console.log(`[stream/route] Connection attempt for sessionId: "${sessionId}"`);

  const server = c.env as any;
  if (!server || typeof server.upgrade !== "function") {
    return c.json({ error: "WebSocket upgrade not supported" }, 500);
  }

  const upgraded = server.upgrade(c.req.raw, {
    data: { sessionId } satisfies StreamWsData,
    headers: { "x-stream-session": sessionId },
  });

  if (!upgraded) {
    return c.json({ error: "WebSocket upgrade failed" }, 500);
  }

  return new Response(null);
});

console.log(`[server] Starting on port ${config.PORT}`);

function cleanupDaemons() {
  try {
    const isWin = process.platform === "win32";
    const cmd = isWin
      ? ["cmd.exe", "/c", "agent-browser", "close", "--all"]
      : ["agent-browser", "close", "--all"];
    Bun.spawnSync({ cmd, stdin: "ignore" });
  } catch (_) {}
}

process.on("SIGINT", () => {
  cleanupDaemons();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanupDaemons();
  process.exit(0);
});

export default {
  port: config.PORT,
  reusePort: true,
  fetch: app.fetch,
  websocket: {
    open(ws: any) {
      if (ws.data?.sessionId !== undefined && ws.data.ctx !== undefined) {
        return wsHandler.open(ws);
      }
      return streamWsHandler.open(ws);
    },
    message(ws: any, raw: any) {
      if (ws.data?.ctx !== undefined) {
        return wsHandler.message(ws, raw);
      }
      return streamWsHandler.message(ws, raw);
    },
    close(ws: any) {
      if (ws.data?.ctx !== undefined) {
        return wsHandler.close(ws);
      }
      return streamWsHandler.close(ws);
    },
  },
};
