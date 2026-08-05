import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppContext } from "../context.ts";
import { UpsertProviderSchema } from "@auto-browser/core";

const router = new Hono<{ Variables: { ctx: AppContext } }>();

// List all providers (masked API keys)
router.get("/", async (c) => {
  const ctx = c.get("ctx");
  const providers = await ctx.providerStore.list(false);
  return c.json(providers);
});

// Upsert provider (add or update)
router.post("/", zValidator("json", UpsertProviderSchema), async (c) => {
  const ctx = c.get("ctx");
  const input = c.req.valid("json");

  const config = await ctx.providerStore.upsert(input);

  // If this provider is marked as default, update active runtime modelProvider
  if (config.isDefault || config.enabled) {
    const full = await ctx.providerStore.get(config.id, true);
    if (full) {
      ctx.modelProvider.updateConfig({
        apiKey: full.apiKey,
        baseUrl: full.baseUrl,
        modelId: full.activeModelId,
        provider: full.id,
      });
    }
  }

  const masked = await ctx.providerStore.get(config.id, false);
  return c.json(masked, 200);
});

// Delete provider configuration
router.delete("/:id", async (c) => {
  const ctx = c.get("ctx");
  const id = c.req.param("id");
  await ctx.providerStore.delete(id);
  return c.json({ ok: true });
});

// Test connection to provider endpoint
router.post(
  "/test",
  zValidator(
    "json",
    z.object({
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      modelId: z.string().min(1),
      providerId: z.string().optional(),
    }),
  ),
  async (c) => {
    const ctx = c.get("ctx");
    const { baseUrl, apiKey, modelId, providerId } = c.req.valid("json");

    let keyToUse = apiKey;
    if ((!keyToUse || keyToUse.includes("...")) && providerId) {
      const existing = await ctx.providerStore.get(providerId, true);
      keyToUse = existing?.apiKey;
    }

    const url = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "") + "/chat/completions";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${keyToUse || ""}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        return c.json({ ok: false, status: res.status, error: errText }, 400);
      }

      return c.json({ ok: true, status: 200, message: "Connection successful!" });
    } catch (err) {
      return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
    }
  },
);

export { router as providersRouter };
