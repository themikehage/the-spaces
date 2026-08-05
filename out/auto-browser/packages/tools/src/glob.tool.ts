import { Type, type Static } from "typebox";
import type { ITool, ToolContext, ToolResult } from "@auto-browser/core";
import { glob } from "node:fs/promises";
import { resolve } from "node:path";

const Parameters = Type.Object({
  pattern: Type.String({ description: "Glob pattern (e.g. src/**/*.ts)" }),
  cwd: Type.Optional(Type.String({ description: "Base directory for the pattern" })),
});

type Params = Static<typeof Parameters>;

export const globTool: ITool<typeof Parameters> = {
  name: "glob",
  label: "Find Files",
  description: "Find files matching a glob pattern",
  parameters: Parameters,
  category: "filesystem",

  async execute(_toolCallId: string, params: Params, _ctx: ToolContext): Promise<ToolResult> {
    const cwd = params.cwd ?? process.cwd();
    const matches: string[] = [];

    for await (const entry of glob(params.pattern, { cwd })) {
      matches.push(resolve(cwd, entry));
    }

    matches.sort();

    return {
      content: [{ type: "text", text: matches.join("\n") || "(no matches)" }],
      details: { count: matches.length, matches },
    };
  },
};
