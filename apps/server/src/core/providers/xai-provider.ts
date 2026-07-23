import { ModelRegistry } from "../../ai";

export function registerXAIProvider(registry: ModelRegistry) {
  registry.registerProvider("xai", {
    name: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    apiKey: "$XAI_API_KEY",
    api: "openai-completions",
    models: [
      { id: "grok-3", name: "Grok 3", reasoning: false, input: ["text"], contextWindow: 131072, maxTokens: 8192, cost: { input: 3, output: 15 } },
      { id: "grok-3-fast", name: "Grok 3 Fast", reasoning: false, input: ["text"], contextWindow: 131072, maxTokens: 8192, cost: { input: 5, output: 25 } },
      { id: "grok-3-mini", name: "Grok 3 Mini", reasoning: true, input: ["text"], contextWindow: 131072, maxTokens: 8192, cost: { input: 0.3, output: 0.5 } },
      { id: "grok-4.3", name: "Grok 4.3", reasoning: true, input: ["text", "image"], contextWindow: 1000000, maxTokens: 30000, cost: { input: 1.25, output: 2.5 } },
    ],
  });
}
