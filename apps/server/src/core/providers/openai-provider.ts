import { ModelRegistry } from "../../ai";

export function registerOpenAIProvider(registry: ModelRegistry) {
  registry.registerProvider("openai", {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "$OPENAI_API_KEY",
    api: "openai-completions",
    models: [
      { id: "gpt-4o", name: "GPT-4o", reasoning: false, input: ["text", "image"], contextWindow: 128000, maxTokens: 16384, cost: { input: 2.5, output: 10 } },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", reasoning: false, input: ["text", "image"], contextWindow: 128000, maxTokens: 16384, cost: { input: 0.15, output: 0.6 } },
      { id: "gpt-4.1", name: "GPT-4.1", reasoning: false, input: ["text", "image"], contextWindow: 1047576, maxTokens: 32768, cost: { input: 2, output: 8 } },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", reasoning: false, input: ["text", "image"], contextWindow: 1047576, maxTokens: 32768, cost: { input: 0.4, output: 1.6 } },
      { id: "o3", name: "o3", reasoning: true, input: ["text", "image"], contextWindow: 200000, maxTokens: 100000, cost: { input: 10, output: 40 } },
      { id: "o3-mini", name: "o3 Mini", reasoning: true, input: ["text"], contextWindow: 200000, maxTokens: 100000, cost: { input: 1.1, output: 4.4 } },
      { id: "o4-mini", name: "o4 Mini", reasoning: true, input: ["text", "image"], contextWindow: 200000, maxTokens: 100000, cost: { input: 1.1, output: 4.4 } },
    ],
  });
}
