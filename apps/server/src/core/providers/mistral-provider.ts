import { ModelRegistry } from "../../ai";

export function registerMistralProvider(registry: ModelRegistry) {
  registry.registerProvider("mistral", {
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    apiKey: "$MISTRAL_API_KEY",
    api: "openai-completions",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large", reasoning: false, input: ["text"], contextWindow: 131072, maxTokens: 131072, cost: { input: 2, output: 6 } },
      { id: "mistral-medium-latest", name: "Mistral Medium", reasoning: false, input: ["text"], contextWindow: 131072, maxTokens: 131072, cost: { input: 0.4, output: 2 } },
      { id: "mistral-small-latest", name: "Mistral Small", reasoning: false, input: ["text"], contextWindow: 131072, maxTokens: 131072, cost: { input: 0.1, output: 0.3 } },
      { id: "codestral-latest", name: "Codestral", reasoning: false, input: ["text"], contextWindow: 256000, maxTokens: 4096, cost: { input: 0.3, output: 0.9 } },
      { id: "ministral-8b-latest", name: "Ministral 8B", reasoning: false, input: ["text"], contextWindow: 131072, maxTokens: 131072, cost: { input: 0.1, output: 0.1 } },
    ],
  });
}
