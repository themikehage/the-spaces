import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { sessionManager } from "../session-manager";

export async function runVideoGenModel(
  username: string,
  modelId: string,
  prompt: string,
  aspectRatio: string,
  duration: number,
  workspaceDir: string
): Promise<string> {
  const isQwen = modelId.includes("wan") || modelId.includes("qwen") || modelId.includes("dashscope");
  const userEnv = sessionManager.userConfig.getUserEnv(username);
  const { authStorage } = sessionManager.userConfig.getUserContext(username);

  const filename = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp4`;
  const localPath = join("assets", "generated", filename);
  const fullPath = join(workspaceDir, localPath);

  const generatedDir = dirname(fullPath);
  if (!existsSync(generatedDir)) {
    mkdirSync(generatedDir, { recursive: true });
  }

  if (isQwen) {
    const apiKey = authStorage.getApiKey("qwen") || userEnv.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY || "";
    if (!apiKey) {
      throw new Error("DASHSCOPE_API_KEY is not configured. Please configure your Qwen Cloud API key in the provider settings.");
    }

    const qwenSize = aspectRatio === "16:9" ? "1280*720" : aspectRatio === "9:16" ? "720*1280" : "960*960";

    // Submit task
    const submitRes = await fetch("https://dashscope-intl.aliyuncs.com/api/v1/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable"
      },
      body: JSON.stringify({
        model: modelId,
        input: {
          prompt: prompt
        },
        parameters: {
          size: qwenSize
        }
      })
    });

    if (!submitRes.ok) {
      const errorText = await submitRes.text();
      throw new Error(`Failed to submit video generation task to Qwen: ${errorText}`);
    }

    const submitData = await submitRes.json();
    const taskId = submitData.output?.task_id;
    if (!taskId) {
      throw new Error("No task_id returned from Qwen video generation API.");
    }

    // Poll task
    let videoUrl = "";
    const startTime = Date.now();
    const timeoutMs = 180000; // 3 minutes
    while (Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusRes = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });
      if (!statusRes.ok) continue;
      const statusData = await statusRes.json();
      const status = statusData.output?.task_status;
      if (status === "SUCCEEDED") {
        videoUrl = statusData.output?.video_url;
        break;
      }
      if (status === "FAILED") {
        throw new Error(`Qwen video generation failed: ${statusData.output?.message || "Unknown error"}`);
      }
    }

    if (!videoUrl) {
      throw new Error("Qwen video generation timed out or failed to return URL.");
    }

    // Download video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error("Failed to download video from Qwen CDN.");
    const arrayBuffer = await videoRes.arrayBuffer();
    writeFileSync(fullPath, Buffer.from(arrayBuffer));
    return localPath;
  }

  // OpenRouter flow
  const apiKey = authStorage.getApiKey("openrouter") || userEnv.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured. Please add your OpenRouter API key in the provider settings.");
  }

  const submitRes = await fetch("https://openrouter.ai/api/v1/videos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      prompt: prompt,
      aspect_ratio: aspectRatio || "16:9",
      duration: duration || 5
    })
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text();
    throw new Error(`Failed to submit video generation task to OpenRouter: ${errorText}`);
  }

  const submitData = await submitRes.json();
  const jobId = submitData.id;
  const pollingUrl = submitData.polling_url || `https://openrouter.ai/api/v1/videos/${jobId}`;
  if (!jobId) {
    throw new Error("No job ID returned from OpenRouter video generation API.");
  }

  // Poll OpenRouter job
  let videoUrl = "";
  const startTime = Date.now();
  const timeoutMs = 180000; // 3 minutes
  while (Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const statusRes = await fetch(pollingUrl, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();
    const status = statusData.status;
    if (status === "completed") {
      videoUrl = statusData.unsigned_urls?.[0];
      break;
    }
    if (status === "failed") {
      throw new Error(`OpenRouter video generation failed: ${statusData.error?.message || "Unknown error"}`);
    }
  }

  if (!videoUrl) {
    throw new Error("OpenRouter video generation timed out or failed to return URL.");
  }

  // Download video
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error("Failed to download video from OpenRouter CDN.");
  const arrayBuffer = await videoRes.arrayBuffer();
  writeFileSync(fullPath, Buffer.from(arrayBuffer));
  return localPath;
}

export function createVideoGenTool(
  workspaceDir: string,
  username: string
) {
  return {
    name: "generate_video",
    description: "Generate a short video clip from a text prompt using a configured video generation model (like Kling or Veo on OpenRouter, or Wan on Qwen).",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Text description of what should happen in the video."
        },
        aspect_ratio: {
          type: "string",
          enum: ["16:9", "9:16", "1:1"],
          default: "16:9",
          description: "The aspect ratio of the generated video."
        },
        duration: {
          type: "number",
          enum: [5, 10],
          default: 5,
          description: "Duration of the video in seconds."
        }
      },
      required: ["prompt"]
    },
    execute: async (toolCallId: string, args: any) => {
      const settings = sessionManager.userConfig.getUserSettings(username);
      if (settings.videoGenEnabled === false) {
        return {
          content: [{ type: "text", text: "Error: Video generation is currently disabled in your settings. Please enable it in Settings > General Tab." }],
          isError: true
        };
      }

      const modelId = settings.videoGenModel;

      if (!modelId) {
        return {
          content: [{ type: "text", text: "Error: No video generation model configured. Please configure a video generation model in Settings > General Tab before calling generate_video." }],
          isError: true
        };
      }

      try {
        const localPath = await runVideoGenModel(
          username,
          modelId,
          args.prompt,
          args.aspect_ratio || "16:9",
          args.duration || 5,
          workspaceDir
        );

        return {
          content: [
            { type: "text", text: `Successfully generated video and saved to workspace: ${localPath}` }
          ],
          details: {
            status: "success",
            filePath: localPath,
            video: { type: "video", src: localPath, title: args.prompt }
          }
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error executing video generation: ${err.message || String(err)}` }],
          isError: true
        };
      }
    }
  };
}
