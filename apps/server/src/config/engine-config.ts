// SPDX-License-Identifier: MIT
import { SPACES_DATA_PATH } from "@spaces/core";
import { join } from "node:path";

export interface EngineConfig {
  modelBaseUrl: string;
  modelApiKey: string;
  modelName: string;
  sessionsDir: string;
}

export function loadEngineConfig(): EngineConfig {
  const modelBaseUrl =
    process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
  const modelApiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || "dummy-key";
  const modelName = process.env.MODEL_NAME || "gpt-4o";
  const sessionsDir = join(SPACES_DATA_PATH(), "sessions");

  return {
    modelBaseUrl,
    modelApiKey,
    modelName,
    sessionsDir,
  };
}
