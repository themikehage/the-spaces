// SPDX-License-Identifier: MIT
import { registerDeepSeekProvider } from "./deepseek-provider";
import { registerGoogleProvider } from "./google-provider";
import { registerGroqProvider } from "./groq-provider";
import { registerMistralProvider } from "./mistral-provider";
import { registerOpenAIProvider } from "./openai-provider";
import { registerOpenCodeGoProvider } from "./opencode-go-provider";
import { registerOpenRouterProvider } from "./openrouter-provider";
import { registerQwenProvider } from "./qwen-provider";
import { registerXAIProvider } from "./xai-provider";

export function registerAllProviders(registry: any, username?: string): void {
  registerOpenAIProvider(registry);
  registerGoogleProvider(registry);
  registerXAIProvider(registry);
  registerDeepSeekProvider(registry);
  registerGroqProvider(registry);
  registerMistralProvider(registry);
  registerOpenRouterProvider(registry, username);
  registerQwenProvider(registry, username);
  registerOpenCodeGoProvider(registry, username);
}

export * from "./model-enrichment-service";
export * from "./provider-persistence";
