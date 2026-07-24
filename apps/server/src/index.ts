// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import { createBunWebSocket, serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SPACES_DATA_PATH } from "shared";
import { auth } from "./auth/index";
import { ensureAuthTables } from "./auth/migrate";
import { memoryRegistry } from "./core/memory/registry";
import { globalErrorHandler } from "./core/middleware/error-handler";
import { requestIdMiddleware } from "./core/middleware/request-id";
import { createServerContext } from "./core/server-context";
import { sessionMetadataStore } from "./core/session/metadata-store";
import { handleRequest as previewRequest, startPreviewServer } from "./preview-server";
import { agentsRouter } from "./routes/agents";
import { approvalsRouter } from "./routes/approvals";
import { authRouter } from "./routes/auth";
import { backupRouter } from "./routes/backup";
import { envRouter } from "./routes/env";
import { factoryRouter } from "./routes/factory";
import { filesRouter } from "./routes/files";
import { galleryRouter } from "./routes/gallery";
import { logsRouter } from "./routes/logs";
import { mcpRouter } from "./routes/mcp";
import { modelsRouter } from "./routes/models";
import { previewRouter } from "./routes/preview";
import { providersRouter } from "./routes/providers";
import { sessionsRouter } from "./routes/sessions/index";
import { settingsRouter } from "./routes/settings";
import { skillsRouter } from "./routes/skills";
import { teamsRouter } from "./routes/teams";
import { teamStore } from "./teams/team-store";
import { createWsContext } from "./ws/factory";

import { authRateLimiter, generalRateLimiter } from "./core/middleware/rate-limiter";
import { securityHeadersMiddleware } from "./core/middleware/security-headers";

sessionMetadataStore.setTeamReader({
  getTeamType(username: string, teamId: string): string | null {
    const team = teamStore.getTeam(username, teamId);
    return team?.teamType ?? null;
  },
});

const PREVIEW_HOST = (process.env.PREVIEW_HOST ?? "").toLowerCase();
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const { upgradeWebSocket, websocket } = createBunWebSocket();

const serverContext = createServerContext();
const app = new Hono();

app.use("/*", requestIdMiddleware());
app.use("/*", securityHeadersMiddleware());
app.use("/*", generalRateLimiter());
app.use("/api/auth/*", authRateLimiter());
app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return null;
      if (ALLOWED_ORIGINS.length === 0) return origin; // development mode default
      return ALLOWED_ORIGINS.includes(origin) ? origin : null;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);
app.use("/*", logger());
app.onError(globalErrorHandler);

app.get("/api/health", (c) =>
  c.json({
    status: "ok",
    version: "1.0.0",
    uptime: process.uptime(),
    dataPath: SPACES_DATA_PATH(),
    timestamp: Date.now(),
  }),
);

app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.route("/api/preview", previewRouter);
app.route("/api", filesRouter);
app.route("/api/auth", authRouter);
app.route("/api/sessions", sessionsRouter);
app.route("/api/models", modelsRouter);
app.route("/api/providers", providersRouter);
app.route("/api/skills", skillsRouter);
app.route("/api/env", envRouter);
app.route("/api/agents", agentsRouter);
app.route("/api/teams", teamsRouter);
app.route("/api/backup", backupRouter);
app.route("/api/logs", logsRouter);
app.route("/api/mcp", mcpRouter);
app.route("/api/settings", settingsRouter);
app.route("/api/gallery", galleryRouter);
app.route("/api/factory", factoryRouter);
app.route("/api/approvals", approvalsRouter);

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    const rawHeaders = c.req.raw.headers;
    const wsContext = createWsContext();
    return {
      onOpen: (evt: Event, ws: any) => wsContext.onOpen(evt, ws, rawHeaders),
      onMessage: (evt: any, ws: any) => wsContext.onMessage(evt, ws),
      onClose: (evt: any, ws: any) => wsContext.onClose(evt, ws),
    };
  }),
);

await ensureAuthTables();

// Run session auto-cleanup on startup
try {
  const usersBase = join(SPACES_DATA_PATH(), "users");
  if (existsSync(usersBase)) {
    const userDirs = readdirSync(usersBase, { withFileTypes: true })
      .filter((ent) => ent.isDirectory())
      .map((ent) => ent.name);
    const { sessionManager } = await import("./core/session-manager");
    for (const username of userDirs) {
      sessionManager.autoCleanupSessions(username).catch((err) => {
        console.error(`[Auto Cleanup] Failed for user ${username}:`, err);
      });
    }

    // Run periodic auto-cleanup every 12 hours
    setInterval(
      () => {
        try {
          if (existsSync(usersBase)) {
            const uDirs = readdirSync(usersBase, { withFileTypes: true })
              .filter((ent) => ent.isDirectory())
              .map((ent) => ent.name);
            for (const u of uDirs) {
              sessionManager.autoCleanupSessions(u).catch(() => {});
            }
          }
        } catch {}
      },
      12 * 60 * 60 * 1000,
    );
  }
} catch (err) {
  console.error("Failed to run startup cleanup tasks:", err);
}

const STATIC_EXTENSIONS = /\.(webmanifest|js|json|png|ico|svg|css)$/;

app.use("/assets/*", serveStatic({ root: "./public" }));
app.use(async (c, next) => {
  if (STATIC_EXTENSIONS.test(c.req.path) && existsSync(`./public${c.req.path}`)) {
    return serveStatic({ root: "./public" })(c, next);
  }
  await next();
});
app.get("/*", serveStatic({ path: "./public/index.html" }));

const port = parseInt(process.env.PORT ?? "3000");

const server = Bun.serve({
  fetch(req, server) {
    const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
    if (PREVIEW_HOST && host === PREVIEW_HOST) {
      return previewRequest(req);
    }
    return app.fetch(req, { server });
  },
  port,
  websocket,
});

console.log(`Server running at http://0.0.0.0:${server.port}`);

if (!PREVIEW_HOST) startPreviewServer();

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down memory providers...");
  await memoryRegistry.shutdownAll();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down memory providers...");
  await memoryRegistry.shutdownAll();
  process.exit(0);
});
