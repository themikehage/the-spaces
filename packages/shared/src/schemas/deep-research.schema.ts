// SPDX-License-Identifier: MIT
import { z } from "zod";

export const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
  publishedDate: z.string().optional(),
  score: z.number().optional(),
  provider: z.string().optional(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const FindingSchema = z.object({
  url: z.string().optional().default(""),
  title: z.string().optional().default("Untitled Finding"),
  rational: z.string().optional().default("Relevant finding"),
  evidence: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  quality: z.enum(["high", "medium", "low"]).optional().default("medium"),
});
export type Finding = z.infer<typeof FindingSchema>;

export const SynthesisResultSchema = z.object({
  report: z.string(),
  gaps: z.array(z.string()),
  nextQuestions: z.array(z.string()),
  sourcesUsed: z.number(),
});
export type SynthesisResult = z.infer<typeof SynthesisResultSchema>;

export const DeepResearchSearchArgsSchema = z.object({
  action: z.literal("search"),
  queries: z.array(z.string().min(1)).min(1).max(10),
  maxResults: z.number().int().min(1).max(25).optional().default(5),
});
export type DeepResearchSearchArgs = z.infer<typeof DeepResearchSearchArgsSchema>;

export const DeepResearchExtractArgsSchema = z.object({
  action: z.literal("extract"),
  urls: z.array(z.string().min(1)).min(1).max(10),
  researchGoal: z.string().min(1),
});
export type DeepResearchExtractArgs = z.infer<typeof DeepResearchExtractArgsSchema>;

export const DeepResearchSynthesizeArgsSchema = z.object({
  action: z.literal("synthesize"),
  findings: z.array(FindingSchema).min(1),
  query: z.string().min(1),
});
export type DeepResearchSynthesizeArgs = z.infer<typeof DeepResearchSynthesizeArgsSchema>;

export const DeepResearchArgsSchema = z.discriminatedUnion("action", [
  DeepResearchSearchArgsSchema,
  DeepResearchExtractArgsSchema,
  DeepResearchSynthesizeArgsSchema,
]);
export type DeepResearchArgs = z.infer<typeof DeepResearchArgsSchema>;
