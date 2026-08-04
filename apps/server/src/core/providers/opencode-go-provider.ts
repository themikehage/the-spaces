// SPDX-License-Identifier: MIT
import { ModelRegistry } from "../../ai";
import { loadProviderModels } from "./provider-persistence";

export function registerOpenCodeGoProvider(registry: ModelRegistry, username?: string) {
  const persisted = username ? loadProviderModels(username, "opencode-go") : null;
  const baseUrl =
    process.env.OPENCODE_BASE_URL ||
    process.env.OPENCODE_API_BASE ||
    "https://opencode.ai/zen/go/v1";

  registry.registerProvider("opencode-go", {
    name: "OpenCode Go",
    baseUrl,
    apiKey: "$OPENCODE_API_KEY",
    api: "openai-completions",
    dynamic: true,
    models: persisted ?? [],
  });
}
