// SPDX-License-Identifier: MIT

export class ModelEnrichmentService {
  normalizeContextWindow(data: Record<string, unknown>): number {
    const keys = [
      "contextWindow",
      "context_window",
      "maxContextTokens",
      "contextLength",
      "context_length",
      "max_input_tokens",
      "input_tokens",
      "maxTokens",
      "max_tokens",
      "maxOutputTokens",
      "output_tokens",
      "tokenLimit",
    ];

    for (const key of keys) {
      const val = data[key];
      if (typeof val === "number" && val > 0) return val;
      if (typeof val === "string") {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return 128000; // sensible default
  }
}
