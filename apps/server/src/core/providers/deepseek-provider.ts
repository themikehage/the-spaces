import { ModelRegistry } from "../../ai";

export function registerDeepSeekProvider(registry: ModelRegistry) {
  registry.registerProvider("deepseek", {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "$DEEPSEEK_API_KEY",
    api: "openai-completions",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3", reasoning: false, input: ["text"], contextWindow: 65536, maxTokens: 8192, cost: { input: 0.27, output: 1.1 } },
      { id: "deepseek-reasoner", name: "DeepSeek R1", reasoning: true, input: ["text"], contextWindow: 65536, maxTokens: 32768, cost: { input: 0.55, output: 2.19 } },
    ],
  });
}
