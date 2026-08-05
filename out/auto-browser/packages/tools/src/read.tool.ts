import { Type, type Static } from "typebox";
import type { ITool, ToolContext, ToolResult } from "@auto-browser/core";
import { readFile } from "node:fs/promises";

const Parameters = Type.Object({
  path: Type.String({ description: "Absolute or relative path to the file to read" }),
  start_line: Type.Optional(Type.Number({ description: "Start line (1-indexed)" })),
  end_line: Type.Optional(Type.Number({ description: "End line (1-indexed, inclusive)" })),
});

type Params = Static<typeof Parameters>;

export const readTool: ITool<typeof Parameters> = {
  name: "read",
  label: "Read File",
  description: "Read the contents of a file, optionally limiting to a line range",
  parameters: Parameters,
  category: "filesystem",

  async execute(_toolCallId: string, params: Params, _ctx: ToolContext): Promise<ToolResult> {
    const content = await readFile(params.path, "utf-8");
    const lines = content.split("\n");

    const start = params.start_line ? params.start_line - 1 : 0;
    const end = params.end_line ? params.end_line : lines.length;
    const slice = lines.slice(start, end).join("\n");

    return {
      content: [{ type: "text", text: slice }],
      details: { path: params.path, totalLines: lines.length },
    };
  },
};
