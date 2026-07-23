import { ModelRegistry } from "../../ai";

export function registerGoogleProvider(registry: ModelRegistry) {
  registry.registerProvider("google", {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: "$GEMINI_API_KEY",
    api: "openai-completions",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", reasoning: true, input: ["text", "image"], contextWindow: 1048576, maxTokens: 65536, cost: { input: 1.25, output: 10 } },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", reasoning: true, input: ["text", "image"], contextWindow: 1048576, maxTokens: 65536, cost: { input: 0.075, output: 0.3 } },
      { id: "gemini-2.5-flash-lite-preview-06-17", name: "Gemini 2.5 Flash Lite", reasoning: false, input: ["text", "image"], contextWindow: 1048576, maxTokens: 65536, cost: { input: 0.01, output: 0.04 } },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", reasoning: false, input: ["text", "image"], contextWindow: 1048576, maxTokens: 8192, cost: { input: 0.1, output: 0.4 } },
    ],
  });
}
