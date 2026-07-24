// SPDX-License-Identifier: MIT
import { registerOpenAIProvider } from "./openai-provider";
import { registerGoogleProvider } from "./google-provider";
import { registerXAIProvider } from "./xai-provider";
import { registerDeepSeekProvider } from "./deepseek-provider";
import { registerGroqProvider } from "./groq-provider";
import { registerMistralProvider } from "./mistral-provider";
import { registerOpenRouterProvider } from "./openrouter-provider";
import { registerQwenProvider } from "./qwen-provider";
import { registerOpenCodeGoProvider } from "./opencode-go-provider";

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
