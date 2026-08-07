// SPDX-License-Identifier: MIT
import type { Finding, SynthesisResult } from "shared";
import type { IModelProvider } from "../../../ports/model.port";

export interface SynthesizerOptions {
  modelProvider?: IModelProvider;
}

export class Synthesizer {
  private modelProvider?: IModelProvider;

  constructor(opts: SynthesizerOptions) {
    this.modelProvider = opts.modelProvider;
  }

  async synthesize(
    findings: Finding[],
    query: string,
    signal?: AbortSignal,
  ): Promise<SynthesisResult> {
    if (findings.length === 0) {
      return {
        report: "No findings available to synthesize.",
        gaps: ["No sources were extracted successfully."],
        nextQuestions: ["Refine queries or expand search scope."],
        sourcesUsed: 0,
      };
    }

    const formattedFindings = findings
      .map(
        (f, idx) =>
          `[Source ${idx + 1}] (${f.quality.toUpperCase()} QUALITY)\nURL: ${f.url}\nTitle: ${f.title}\nRelevance: ${f.rational}\nEvidence: ${f.evidence}\nSummary: ${f.summary}\n`,
      )
      .join("\n---\n");

    const prompt = `You are a Lead AI Researcher synthesizing deep research findings for the target topic: "${query}".

Collected Source Findings:
${formattedFindings}

Synthesize these findings into a comprehensive research checkpoint report in JSON format matching this schema EXACTLY:
{
  "report": "Detailed, highly technical synthesis of findings, citing [Source N] inline.",
  "gaps": ["List of missing information, unverified claims, or topics needing deeper investigation"],
  "nextQuestions": ["List of suggested search queries or follow-up questions to explore in the next round"]
}

Rules:
1. Include concrete facts, figures, dates, and evidence from the sources.
2. Be explicit about gaps and uncertainties.
3. Respond ONLY with valid JSON, no markdown codeblocks or extra text.`;

    if (this.modelProvider?.streamComplete) {
      try {
        const res = await this.modelProvider.streamComplete({
          messages: [{ role: "user", content: prompt }],
          signal,
          temperature: 0.3,
        });

        const rawJson = res.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(rawJson);

        return {
          report: String(parsed.report || "Synthesis complete."),
          gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String) : [],
          nextQuestions: Array.isArray(parsed.nextQuestions)
            ? parsed.nextQuestions.map(String)
            : [],
          sourcesUsed: findings.length,
        };
      } catch {
        /* fallback to deterministic merge */
      }
    }

    const fallbackReport = findings
      .map((f) => `### ${f.title}\n- **URL:** ${f.url}\n- **Summary:** ${f.summary}`)
      .join("\n\n");

    return {
      report: fallbackReport,
      gaps: ["Automated LLM synthesis fallback applied."],
      nextQuestions: ["Verify individual sources manually."],
      sourcesUsed: findings.length,
    };
  }
}
