import { ModelRegistry } from "../../ai";
import { loadProviderModels } from "./provider-persistence";

export function registerOpenRouterProvider(registry: ModelRegistry, username?: string) {
  const persisted = username ? loadProviderModels(username, "openrouter") : null;

  registry.registerProvider("openrouter", {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "$OPENROUTER_API_KEY",
    api: "openai-completions",
    dynamic: true,
    models: persisted ?? [],
  });
}
