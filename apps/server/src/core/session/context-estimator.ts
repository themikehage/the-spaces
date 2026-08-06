// SPDX-License-Identifier: MIT
import { estimateContextTokens } from "../../vendor/ai/src/utils/estimate.ts";
import { convertToLlm } from "./messages";

export interface ContextUsageResult {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  limit: number | null;
}

export function estimateContextUsage(
  messages: any[],
  systemPrompt: string,
  contextWindow?: number | null,
): ContextUsageResult {
  try {
    const llmContext = {
      systemPrompt,
      messages: convertToLlm(messages),
    };
    const estimate = estimateContextTokens(llmContext);
    return {
      totalTokens: estimate.tokens,
      inputTokens: estimate.usageTokens,
      outputTokens: estimate.trailingTokens,
      limit: contextWindow ?? null,
    };
  } catch (err) {
    console.error("[ContextEstimator] Error estimating context tokens:", err);
    let charCount = 0;
    for (const msg of messages) {
      if (msg.content) {
        if (typeof msg.content === "string") {
          charCount += msg.content.length;
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === "text" && block.text) {
              charCount += block.text.length;
            } else if (block.type === "image") {
              const imageTokens = 1200;
              charCount += imageTokens * 4;
            }
          }
        }
      }
    }
    const estimatedTokens = Math.ceil(charCount / 4);
    return {
      totalTokens: estimatedTokens,
      inputTokens: estimatedTokens,
      outputTokens: 0,
      limit: contextWindow ?? null,
    };
  }
}
