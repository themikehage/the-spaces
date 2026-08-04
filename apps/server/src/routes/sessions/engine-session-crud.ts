// SPDX-License-Identifier: MIT
import { zValidator } from "@hono/zod-validator";
import { CreateSessionSchema } from "@spaces/core";
import { Hono } from "hono";
import type { AppContext } from "../../context";
import { authMiddleware, getAuthPayload } from "../../middleware/auth";

export function createEngineSessionCrudRouter(appContext: AppContext): Hono {
  const router = new Hono();

  router.use("/*", authMiddleware);

  router.get("/", async (c) => {
    const sessions = await appContext.sessionStore.listSessions();
    return c.json({ sessions });
  });

  router.post("/", zValidator("json", CreateSessionSchema), async (c) => {
    const data = c.req.valid("json");
    const sessionId = crypto.randomUUID();
    const session = await appContext.sessionStore.create(sessionId, data.name);
    appContext.createSessionAgent(sessionId);
    return c.json(session, 201);
  });

  router.get("/:id/messages", async (c) => {
    const id = c.req.param("id");
    const messages = await appContext.sessionStore.getMessages(id);
    return c.json({ messages });
  });

  router.post("/:id/model", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const { provider, modelId } = body;
    if (!provider || !modelId) {
      return c.json({ error: "Missing provider or modelId" }, 400);
    }
    const { username } = getAuthPayload(c);
    const modelString = `${provider}/${modelId}`;

    appContext.sessionMetadataStore.saveSessionMetadata(username, id, {
      model: modelString,
      provider,
      modelId,
    });

    const cachedAgent = appContext.agentCache.get(id);
    if (cachedAgent) {
      await cachedAgent.dispose().catch(() => {});
      appContext.agentCache.delete(id);
    }

    return c.json({ success: true, model: modelString });
  });

  router.get("/:id/model", async (c) => {
    const id = c.req.param("id");
    const { username } = getAuthPayload(c);
    const metadata = appContext.sessionMetadataStore.getSessionMetadata(username, id);
    return c.json({
      model: metadata?.model || (metadata?.provider && metadata?.modelId ? `${metadata.provider}/${metadata.modelId}` : null),
      provider: metadata?.provider || null,
      modelId: metadata?.modelId || null,
    });
  });


  router.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const cachedAgent = appContext.agentCache.get(id);
    if (cachedAgent) {
      await cachedAgent.dispose();
      appContext.agentCache.delete(id);
    }
    await appContext.sessionStore.delete(id);
    return c.json({ success: true });
  });

  return router;
}
