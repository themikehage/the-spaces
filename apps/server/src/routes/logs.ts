import { Hono } from "hono";
import { authMiddleware, getAuthPayload } from "../middleware/auth";
import { eventBroker } from "../lib/event-broker";
import { getToolCallLogs } from "../core/audit-log";
import { observabilityService } from "../core/observability/observability-service";

export const logsRouter = new Hono();

logsRouter.use("/*", authMiddleware);

logsRouter.get("/", (c) => {
  const { username } = getAuthPayload(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const logs = eventBroker.getHistory(username);
  return c.json({ logs });
});

logsRouter.get("/tool-calls", (c) => {
  const { username } = getAuthPayload(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const limitParam = c.req.query("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 100;
  const toolCallLogs = getToolCallLogs(username, limit);

  return c.json({ toolCalls: toolCallLogs });
});

logsRouter.get("/metrics", (c) => {
  const { username } = getAuthPayload(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const metrics = observabilityService.getMetrics(username);
  return c.json(metrics);
});
