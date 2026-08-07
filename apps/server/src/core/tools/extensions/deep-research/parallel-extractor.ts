// SPDX-License-Identifier: MIT
import type { Finding } from "shared";
import type { IModelProvider } from "../../../ports/model.port";
import { createWebFetchTool } from "../web-fetch";

export interface ParallelExtractorOptions {
  username: string;
  modelProvider?: IModelProvider;
  concurrency?: number;
}

export class ParallelExtractor {
  private username: string;
  private modelProvider?: IModelProvider;
  private concurrency: number;

  constructor(opts: ParallelExtractorOptions) {
    this.username = opts.username;
    this.modelProvider = opts.modelProvider;
    this.concurrency = opts.concurrency || 3;
  }

  async extractBatch(
    urls: string[],
    researchGoal: string,
    onProgress?: (done: number, total: number, currentUrl: string) => void,
    signal?: AbortSignal,
  ): Promise<Finding[]> {
    const findings: Finding[] = [];
    let completed = 0;
    const total = urls.length;

    const fetchTool = createWebFetchTool({ username: this.username });

    const processUrl = async (url: string): Promise<Finding | null> => {
      if (signal?.aborted) return null;
      try {
        const fetchResult = await fetchTool.execute(`extract-${Date.now()}`, { url }, signal);
        const textContent = fetchResult.content?.[0]?.text || "";

        if (fetchResult.isError || !textContent || textContent.length < 100) {
          return null;
        }

        const finding = await this.extractFindingFromText(url, textContent, researchGoal, signal);
        return finding;
      } catch {
        return null;
      } finally {
        completed++;
        if (onProgress) {
          onProgress(completed, total, url);
        }
      }
    };

    const pool: Promise<Finding | null>[] = [];
    const queue = [...urls];

    const runWorker = async () => {
      while (queue.length > 0 && !signal?.aborted) {
        const url = queue.shift();
        if (!url) break;
        const result = await processUrl(url);
        if (result && result.evidence && result.evidence.length >= 20) {
          findings.push(result);
        }
      }
    };

    const workers = Array.from({ length: Math.min(this.concurrency, urls.length) }, () =>
      runWorker(),
    );
    await Promise.all(workers);

    return findings;
  }

  private async extractFindingFromText(
    url: string,
    pageContent: string,
    researchGoal: string,
    signal?: AbortSignal,
  ): Promise<Finding> {
    const truncatedContent = pageContent.substring(0, 15000);

    const prompt = `Analyze the following webpage content with respect to the research goal.
Research Goal: "${researchGoal}"
URL: "${url}"

Webpage Content:
${truncatedContent}

Extract structured research findings in JSON format matching this schema EXACTLY:
{
  "title": "Page title or descriptive topic",
  "rational": "Why this page is relevant to the research goal",
  "evidence": "Key verbatim facts, statistics, benchmarks, or direct quotes found in the text",
  "summary": "Concise synthesis of the key findings from this source",
  "quality": "high" | "medium" | "low"
}

Respond ONLY with valid JSON, no markdown codeblocks or extra text.`;

    if (this.modelProvider?.streamComplete) {
      try {
        const res = await this.modelProvider.streamComplete({
          messages: [{ role: "user", content: prompt }],
          signal,
          temperature: 0.2,
        });

        const rawJson = res.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(rawJson);

        return {
          url,
          title: String(parsed.title || "Source Reading"),
          rational: String(parsed.rational || "Relevant content found"),
          evidence: String(parsed.evidence || ""),
          summary: String(parsed.summary || truncatedContent.substring(0, 300)),
          quality: ["high", "medium", "low"].includes(parsed.quality) ? parsed.quality : "medium",
        };
      } catch {
        /* fallback to raw excerpt */
      }
    }

    return {
      url,
      title: "Extracted Source",
      rational: "Extracted content for research goal",
      evidence: truncatedContent.substring(0, 500),
      summary: truncatedContent.substring(0, 300),
      quality: "medium",
    };
  }
}
