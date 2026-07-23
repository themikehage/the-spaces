import { ModelRegistry } from "../../ai";

export function registerGroqProvider(registry: ModelRegistry) {
  registry.registerProvider("groq", {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: "$GROQ_API_KEY",
    api: "openai-completions",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", reasoning: false, input: ["text"], contextWindow: 131072, maxTokens: 32768, cost: { input: 0.59, output: 0.79 } },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", reasoning: false, input: ["text"], contextWindow: 131072, maxTokens: 131072, cost: { input: 0.05, output: 0.08 } },
      { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17B", reasoning: false, input: ["text", "image"], contextWindow: 131072, maxTokens: 8192, cost: { input: 0.11, output: 0.34 } },
      { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick 17B", reasoning: false, input: ["text", "image"], contextWindow: 131072, maxTokens: 8192, cost: { input: 0.2, output: 0.6 } },
      { id: "qwen/qwen3-32b", name: "Qwen3 32B", reasoning: true, input: ["text"], contextWindow: 131072, maxTokens: 40960, cost: { input: 0.29, output: 0.59 } },
    ],
  });
}
