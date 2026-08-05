import { Type, type Static } from "typebox";
import type { ITool, ToolContext, ToolResult } from "@auto-browser/core";
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { resolve } from "node:path";

const Parameters = Type.Object({
  pattern: Type.String({ description: "Text or regex pattern to search" }),
  path: Type.String({ description: "File path or glob pattern to search in" }),
  is_regex: Type.Optional(Type.Boolean({ description: "Treat pattern as regex (default false)" })),
  case_insensitive: Type.Optional(
    Type.Boolean({ description: "Case-insensitive search (default false)" }),
  ),
  context_lines: Type.Optional(
    Type.Number({ description: "Lines of context around matches (default 0)" }),
  ),
});

type Params = Static<typeof Parameters>;

interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

export const grepTool: ITool<typeof Parameters> = {
  name: "grep",
  label: "Search Content",
  description: "Search for a pattern in files, with optional regex and context lines",
  parameters: Parameters,
  category: "filesystem",

  async execute(_toolCallId: string, params: Params, _ctx: ToolContext): Promise<ToolResult> {
    const flags = params.case_insensitive ? "gi" : "g";
    const regex = params.is_regex
      ? new RegExp(params.pattern, flags)
      : new RegExp(params.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);

    const cwd = process.cwd();
    const filePaths: string[] = [];

    for await (const entry of glob(params.path, { cwd })) {
      filePaths.push(resolve(cwd, entry));
    }

    if (filePaths.length === 0) {
      filePaths.push(params.path);
    }

    const matches: GrepMatch[] = [];
    const contextLines = params.context_lines ?? 0;

    for (const filePath of filePaths) {
      try {
        const content = await readFile(filePath, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i] ?? "";
          if (regex.test(line)) {
            regex.lastIndex = 0;
            matches.push({ file: filePath, line: i + 1, content: line });
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    if (matches.length === 0) {
      return {
        content: [{ type: "text", text: "No matches found" }],
        details: { count: 0, matches: [] },
      };
    }

    const output = matches.map((m) => `${m.file}:${m.line}: ${m.content}`).join("\n");

    return {
      content: [{ type: "text", text: output }],
      details: { count: matches.length, matches },
    };
  },
};
