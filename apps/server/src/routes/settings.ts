// SPDX-License-Identifier: MIT
import { Hono } from "hono";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getGlobalAgentsMdPath, getUserDir, getWorkspaceDir } from "shared";
import { getAppConfig } from "../config/app-config";
import { applyCacheHeaders } from "../core/cache-headers";
import { sessionManager } from "../core/session-manager";
import { runImageGenModel } from "../core/tools/image-gen-tool";
import { runVideoGenModel } from "../core/tools/video-gen-tool";
import { runVisionModel } from "../core/tools/vision-tool";
import { getUsername } from "../lib/auth-helpers";
import { authMiddleware, getAuthPayload } from "../middleware/auth";

export const settingsRouter = new Hono();

settingsRouter.get("/avatar", async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const userDir = getUserDir(username);
  if (!existsSync(userDir)) return c.notFound();

  const files = readdirSync(userDir);
  const avatarFile = files.find((f) => f.startsWith("factory-avatar."));
  if (!avatarFile) return c.notFound();
  const avatarPath = join(userDir, avatarFile);
  const cacheResponse = applyCacheHeaders(c, avatarPath);
  if (cacheResponse) {
    return cacheResponse;
  }

  const file = Bun.file(avatarPath);
  const responseHeaders: Record<string, string> = {
    "Content-Type": file.type || "application/octet-stream",
  };
  c.res.headers.forEach((val, key) => {
    responseHeaders[key] = val;
  });

  return c.body(file as any, 200, responseHeaders);
});

settingsRouter.use("/*", authMiddleware);

settingsRouter.get("/", (c) => {
  const { username } = getAuthPayload(c);
  const settings = sessionManager.userConfig.getUserSettings(username);
  const appConfig = getAppConfig();

  const globalAgentsMd = getGlobalAgentsMdPath(username);
  let factorySystemPrompt = settings.factorySystemPrompt ?? "";
  if (existsSync(globalAgentsMd)) {
    factorySystemPrompt = readFileSync(globalAgentsMd, "utf-8");
  }

  return c.json({
    memoryEnabled: settings.memoryEnabled ?? true,
    memoryAutoStore: settings.memoryAutoStore ?? false,
    memoryEmbeddings: settings.memoryEmbeddings ?? true,
    visionModel: settings.visionModel ?? "",
    imageGenModel: settings.imageGenModel ?? "",
    videoGenModel: settings.videoGenModel ?? "",
    videoGenEnabled: settings.videoGenEnabled ?? true,
    subagentMaxDepth:
      settings.subagentMaxDepth !== undefined
        ? Number(settings.subagentMaxDepth)
        : appConfig.subagent.maxDepth,
    factoryName: settings.factoryName ?? "Spaces",
    factoryAvatarUrl: settings.factoryAvatarUrl ?? null,
    factorySystemPrompt,
    showPromptPreviews: settings.showPromptPreviews ?? false,
    previewBaseUrl: process.env.PREVIEW_BASE_URL ?? null,
  });
});

settingsRouter.patch("/", async (c) => {
  const { username } = getAuthPayload(c);
  try {
    const body = await c.req.json<{
      memoryEnabled?: boolean;
      memoryAutoStore?: boolean;
      memoryEmbeddings?: boolean;
      visionModel?: string;
      imageGenModel?: string;
      videoGenModel?: string;
      videoGenEnabled?: boolean;
      subagentMaxDepth?: number;
      factoryName?: string;
      factoryAvatarUrl?: string | null;
      factorySystemPrompt?: string;
      showPromptPreviews?: boolean;
    }>();

    const updates: Record<string, any> = {};

    if (body.memoryEnabled !== undefined) {
      updates.memoryEnabled = !!body.memoryEnabled;
    }
    if (body.memoryAutoStore !== undefined) {
      updates.memoryAutoStore = !!body.memoryAutoStore;
    }
    if (body.memoryEmbeddings !== undefined) {
      updates.memoryEmbeddings = !!body.memoryEmbeddings;
    }
    if (body.visionModel !== undefined) {
      updates.visionModel = String(body.visionModel);
    }
    if (body.imageGenModel !== undefined) {
      updates.imageGenModel = String(body.imageGenModel);
    }
    if (body.videoGenModel !== undefined) {
      updates.videoGenModel = String(body.videoGenModel);
    }
    if (body.videoGenEnabled !== undefined) {
      updates.videoGenEnabled = !!body.videoGenEnabled;
    }
    if (body.subagentMaxDepth !== undefined) {
      const depthVal = Number(body.subagentMaxDepth);
      if (!isNaN(depthVal) && Number.isInteger(depthVal) && depthVal >= 0) {
        updates.subagentMaxDepth = depthVal;
      }
    }
    if (body.factoryName !== undefined) {
      updates.factoryName = String(body.factoryName);
    }
    if (body.factoryAvatarUrl !== undefined) {
      updates.factoryAvatarUrl = body.factoryAvatarUrl ? String(body.factoryAvatarUrl) : null;
    }
    if (body.factorySystemPrompt !== undefined) {
      const globalAgentsMd = getGlobalAgentsMdPath(username);
      const dotSpacesDir = join(getWorkspaceDir(username), ".spaces");
      if (!existsSync(dotSpacesDir)) {
        mkdirSync(dotSpacesDir, { recursive: true });
      }
      writeFileSync(globalAgentsMd, String(body.factorySystemPrompt), "utf-8");
    }
    if (body.showPromptPreviews !== undefined) {
      updates.showPromptPreviews = !!body.showPromptPreviews;
    }

    sessionManager.userConfig.saveUserSettings(username, updates);

    return c.json({
      ok: true,
      settings: { ...sessionManager.userConfig.getUserSettings(username) },
    });
  } catch (e) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

settingsRouter.post("/avatar", async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.parseBody();
  const file = body.file as File | undefined;
  if (!file) return c.json({ error: "No file provided" }, 400);

  const userDir = getUserDir(username);
  if (!existsSync(userDir)) {
    mkdirSync(userDir, { recursive: true });
  }

  try {
    const files = readdirSync(userDir);
    for (const f of files) {
      if (f.startsWith("factory-avatar.")) {
        unlinkSync(join(userDir, f));
      }
    }
  } catch { /* noop */ }

  const ext = file.name.split(".").pop() || "png";
  const avatarPath = join(userDir, `factory-avatar.${ext}`);
  const buffer = await file.arrayBuffer();
  writeFileSync(avatarPath, Buffer.from(buffer));

  const avatarUrl = `/api/settings/avatar`;
  sessionManager.userConfig.saveUserSettings(username, { factoryAvatarUrl: avatarUrl });

  return c.json({ avatarUrl });
});

settingsRouter.delete("/avatar", async (c) => {
  const username = getUsername(c);
  if (!username) return c.json({ error: "Unauthorized" }, 401);

  const userDir = getUserDir(username);
  if (existsSync(userDir)) {
    try {
      const files = readdirSync(userDir);
      for (const f of files) {
        if (f.startsWith("factory-avatar.")) {
          unlinkSync(join(userDir, f));
        }
      }
    } catch { /* noop */ }
  }

  sessionManager.userConfig.saveUserSettings(username, { factoryAvatarUrl: null });

  return c.json({ ok: true });
});

settingsRouter.post("/test-vision", async (c) => {
  const { username } = getAuthPayload(c);
  try {
    const body = await c.req.json<{
      modelId: string;
      prompt: string;
      image?: string;
      mimeType?: string;
    }>();

    if (!body.modelId) {
      return c.json({ error: "Missing modelId" }, 400);
    }

    const prompt = body.prompt || "Describe this image in one word";
    const defaultImage =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const base64Data = body.image || defaultImage;
    const mimeType = body.mimeType || "image/png";

    const responseText = await runVisionModel(username, body.modelId, prompt, base64Data, mimeType);
    return c.json({ ok: true, response: responseText });
  } catch (err: any) {
    return c.json({ error: err.message || String(err) }, 500);
  }
});

settingsRouter.post("/test-image-gen", async (c) => {
  const { username } = getAuthPayload(c);
  try {
    const body = await c.req.json<{
      modelId: string;
      prompt: string;
      size?: string;
    }>();

    if (!body.modelId) {
      return c.json({ error: "Missing modelId" }, 400);
    }
    if (!body.prompt) {
      return c.json({ error: "Missing prompt" }, 400);
    }

    const { authStorage } = sessionManager.userConfig.getUserContext(username);
    const userEnv = sessionManager.userConfig.getUserEnv(username);
    const apiKey =
      authStorage.getApiKey("qwen") ||
      userEnv.DASHSCOPE_API_KEY ||
      process.env.DASHSCOPE_API_KEY ||
      "";

    const workspaceDir = getWorkspaceDir(username);
    const size = body.size || "1024x1024";

    const localPath = await runImageGenModel(
      username,
      body.modelId,
      body.prompt,
      size,
      workspaceDir,
    );
    return c.json({ ok: true, imageUrl: `/api/workspace/${localPath.replace(/\\/g, "/")}` });
  } catch (err: any) {
    console.error(`[DIAGNOSTIC TEST-IMAGE-GEN] Error: ${err.message || String(err)}`);
    return c.json({ error: err.message || String(err) }, 500);
  }
});

settingsRouter.post("/test-video-gen", async (c) => {
  const { username } = getAuthPayload(c);
  try {
    const body = await c.req.json<{
      modelId: string;
      prompt: string;
      aspectRatio?: string;
      duration?: number;
    }>();

    if (!body.modelId) {
      return c.json({ error: "Missing modelId" }, 400);
    }
    if (!body.prompt) {
      return c.json({ error: "Missing prompt" }, 400);
    }

    const { authStorage } = sessionManager.userConfig.getUserContext(username);
    const userEnv = sessionManager.userConfig.getUserEnv(username);
    const apiKey =
      authStorage.getApiKey("openrouter") ||
      userEnv.OPENROUTER_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      "";

    const workspaceDir = getWorkspaceDir(username);
    const localPath = await runVideoGenModel(
      username,
      body.modelId,
      body.prompt,
      body.aspectRatio || "16:9",
      body.duration || 5,
      workspaceDir,
    );
    return c.json({ ok: true, videoUrl: `/api/workspace/${localPath.replace(/\\/g, "/")}` });
  } catch (err: any) {
    console.error(`[DIAGNOSTIC TEST-VIDEO-GEN] Error: ${err.message || String(err)}`);
    return c.json({ error: err.message || String(err) }, 500);
  }
});
