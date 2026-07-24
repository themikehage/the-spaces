// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import { PromptPreviewRequestSchema } from "shared";
import { sessionPromptBuilder } from "../core/session/prompt-builder";
import { authMiddleware, getAuthPayload } from "../middleware/auth";

export const promptsRouter = new Hono();

promptsRouter.use("/*", authMiddleware);

promptsRouter.post("/preview", async (c) => {
  const { username } = getAuthPayload(c);
  try {
    const rawBody = await c.req.json();
    const parsed = PromptPreviewRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: "Invalid request payload", details: parsed.error.format() }, 400);
    }

    const preview = await sessionPromptBuilder.previewSystemPrompt({
      username,
      entityType: parsed.data.entityType,
      agentId: parsed.data.agentId,
      projectId: parsed.data.projectId,
      teamId: parsed.data.teamId,
      subagentId: parsed.data.subagentId,
    });

    return c.json(preview);
  } catch (e: any) {
    console.error("[PromptsRouter] Error generating preview:", e);
    return c.json({ error: e.message || "Failed to generate prompt preview" }, 500);
  }
});
