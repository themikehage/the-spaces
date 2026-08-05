import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppContext } from "../context.ts";
import { createAgent, ToolExecutor } from "@auto-browser/engine";

const router = new Hono<{ Variables: { ctx: AppContext } }>();

router.post(
  "/",
  zValidator("json", z.object({ name: z.string().min(1).max(100).optional() })),
  async (c) => {
    const ctx = c.get("ctx");
    const { name } = c.req.valid("json");

    const id = crypto.randomUUID();
    const session = await ctx.sessionStore.createSession(id, name);

    const agent = await createAgent({
      id,
      modelProvider: ctx.modelProvider,
      sessionStore: ctx.sessionStore,
      toolExecutor: new ToolExecutor(ctx.toolRegistry),
      systemPrompt: ctx.config.SYSTEM_PROMPT,
    });

    ctx.agents.set(id, agent);

    return c.json(session, 201);
  },
);

router.get("/", async (c) => {
  const ctx = c.get("ctx");
  const sessions = await ctx.sessionStore.listSessions();
  return c.json(sessions);
});

router.get("/:id/messages", async (c) => {
  const ctx = c.get("ctx");
  const id = c.req.param("id");

  const messages = await ctx.sessionStore.getMessages(id);
  return c.json(messages);
});

router.delete("/:id", async (c) => {
  const ctx = c.get("ctx");
  const id = c.req.param("id");

  const agent = ctx.agents.get(id);
  if (agent) {
    await agent.dispose();
    ctx.agents.delete(id);
  }

  await ctx.sessionStore.deleteSession(id);
  return c.json({ ok: true });
});

export { router as sessionsRouter };
