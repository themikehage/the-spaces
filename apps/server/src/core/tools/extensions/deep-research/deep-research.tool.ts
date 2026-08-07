// SPDX-License-Identifier: MIT
import {
  DeepResearchArgsSchema,
  type DeepResearchArgs,
  type Finding,
  type SearchResult,
  type SynthesisResult,
} from "shared";
import type { ToolContext } from "../../../ports/tool.port";
import type { IModelProvider } from "../../../ports/model.port";
import { SearchProviderChain } from "./search-provider";
import { ParallelExtractor } from "./parallel-extractor";
import { Synthesizer } from "./synthesizer";

export interface DeepResearchOptions {
  username: string;
  modelProvider?: IModelProvider;
}

export function createDeepResearchTool(opts: DeepResearchOptions) {
  const searchChain = new SearchProviderChain(opts.username);
  const extractor = new ParallelExtractor({
    username: opts.username,
    modelProvider: opts.modelProvider,
  });
  const synthesizer = new Synthesizer({
    modelProvider: opts.modelProvider,
  });

  return {
    name: "deep_research",
    label: "Deep Research",
    description:
      "Perform structured deep research using three optimized atomic actions: 'search' (multi-query parallel search with fallback), 'extract' (batch fetch and LLM evidence extraction), and 'synthesize' (LLM merge of findings, gap identification, and next questions).",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["search", "extract", "synthesize"],
          description: "Atomic research action to perform",
        },
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Array of search queries for 'search' action (1-10 queries)",
        },
        maxResults: {
          type: "integer",
          default: 5,
          description: "Max search results per query for 'search' action (1-25)",
        },
        urls: {
          type: "array",
          items: { type: "string" },
          description: "Array of URLs to extract evidence from for 'extract' action (1-10 URLs)",
        },
        researchGoal: {
          type: "string",
          description: "The specific objective or hypothesis for 'extract' action",
        },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Title or subject of finding" },
              rational: { type: "string", description: "Relevance rationale for the research goal" },
              summary: { type: "string", description: "Summary of key findings" },
              evidence: { type: "string", description: "Verbatim quotes, stats, or facts" },
              url: { type: "string", description: "Source URL (optional)" },
              quality: { type: "string", enum: ["high", "medium", "low"] },
            },
          },
          description:
            "Structured findings from previous 'extract' actions for 'synthesize'. Each item should contain title, summary, evidence, rational, and optional url.",
        },
        query: {
          type: "string",
          description: "Overall research question or topic for 'synthesize' action",
        },
      },
      required: ["action"],
    },
    execute: async (toolCallId: string, rawArgs: unknown, ctx?: ToolContext) => {
      const parseResult = DeepResearchArgsSchema.safeParse(rawArgs);
      if (!parseResult.success) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid deep_research arguments: ${parseResult.error.message}\nHint for 'synthesize': findings items accept { title, summary, evidence, rational, url, quality }.`,
            },
          ],
          isError: true,
        };
      }

      const args = parseResult.data as DeepResearchArgs;

      try {
        if (args.action === "search") {
          ctx?.onUpdate?.({
            phase: "search",
            status: "running",
            queries: args.queries,
            message: `Searching ${args.queries.length} queries in parallel...`,
          });

          const results: SearchResult[] = await searchChain.executeMultiQuery(
            args.queries,
            args.maxResults || 5,
            ctx?.signal,
          );

          ctx?.onUpdate?.({
            phase: "search",
            status: "completed",
            totalResults: results.length,
          });

          const formatted = results
            .map(
              (r, i) =>
                `${i + 1}. [${r.title}](${r.url}) (via ${r.provider})\n   Date: ${r.publishedDate || "N/A"}\n   Snippet: ${r.snippet}`,
            )
            .join("\n\n");

          return {
            content: [
              {
                type: "text",
                text: results.length > 0 ? formatted : "No search results found.",
              },
            ],
            details: { resultsCount: results.length, results },
          };
        }

        if (args.action === "extract") {
          ctx?.onUpdate?.({
            phase: "extract",
            status: "running",
            totalUrls: args.urls.length,
            message: `Extracting evidence from ${args.urls.length} URLs in parallel...`,
          });

          const findings: Finding[] = await extractor.extractBatch(
            args.urls,
            args.researchGoal,
            (done, total, currentUrl) => {
              ctx?.onUpdate?.({
                phase: "extract",
                status: "progress",
                done,
                total,
                currentUrl,
                message: `Extracted ${done}/${total} URLs`,
              });
            },
            ctx?.signal,
          );

          ctx?.onUpdate?.({
            phase: "extract",
            status: "completed",
            extractedCount: findings.length,
          });

          const formatted = findings
            .map(
              (f, i) =>
                `### Finding ${i + 1}: ${f.title}\n- **URL:** ${f.url}\n- **Quality:** ${f.quality}\n- **Relevance:** ${f.rational}\n- **Evidence:** ${f.evidence}\n- **Summary:** ${f.summary}`,
            )
            .join("\n\n---\n\n");

          return {
            content: [
              {
                type: "text",
                text: findings.length > 0 ? formatted : "No quality evidence extracted.",
              },
            ],
            details: { extractedCount: findings.length, findings },
          };
        }

        if (args.action === "synthesize") {
          ctx?.onUpdate?.({
            phase: "synthesize",
            status: "running",
            findingsCount: args.findings.length,
            message: `Synthesizing ${args.findings.length} findings into report checkpoint...`,
          });

          const synthesis: SynthesisResult = await synthesizer.synthesize(
            args.findings as Finding[],
            args.query,
            ctx?.signal,
          );

          ctx?.onUpdate?.({
            phase: "synthesize",
            status: "completed",
            sourcesUsed: synthesis.sourcesUsed,
          });

          const formattedReport = `## Deep Research Report: ${args.query}\n\n${synthesis.report}\n\n### Identified Knowledge Gaps\n${synthesis.gaps.map((g) => `- ${g}`).join("\n")}\n\n### Suggested Next Questions\n${synthesis.nextQuestions.map((q) => `- ${q}`).join("\n")}`;

          return {
            content: [{ type: "text", text: formattedReport }],
            details: synthesis,
          };
        }
      } catch (err) {
        return {
          content: [{ type: "text", text: `deep_research execution failed: ${String(err)}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: "Unknown action" }],
        isError: true,
      };
    },
  };
}
