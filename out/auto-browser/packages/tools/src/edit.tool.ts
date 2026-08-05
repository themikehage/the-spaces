import { Type, type Static } from "typebox";
import type { ITool, ToolContext, ToolResult } from "@auto-browser/core";
import { readFile, writeFile } from "node:fs/promises";

const Parameters = Type.Object({
  path: Type.String({ description: "Path to the file to edit" }),
  old_string: Type.String({ description: "Exact string to find and replace" }),
  new_string: Type.String({ description: "Replacement string" }),
  replace_all: Type.Optional(
    Type.Boolean({ description: "Replace all occurrences (default false, first only)" }),
  ),
});

type Params = Static<typeof Parameters>;

export const editTool: ITool<typeof Parameters> = {
  name: "edit",
  label: "Edit File",
  description: "Replace an exact string in a file with a new string",
  parameters: Parameters,
  category: "filesystem",

  async execute(_toolCallId: string, params: Params, _ctx: ToolContext): Promise<ToolResult> {
    const original = await readFile(params.path, "utf-8");

    if (!original.includes(params.old_string)) {
      return {
        content: [{ type: "text", text: `Error: old_string not found in ${params.path}` }],
        details: { found: false },
      };
    }

    const updated = params.replace_all
      ? original.replaceAll(params.old_string, params.new_string)
      : original.replace(params.old_string, params.new_string);

    await writeFile(params.path, updated, "utf-8");

    const occurrences = original.split(params.old_string).length - 1;
    const replaced = params.replace_all ? occurrences : 1;

    return {
      content: [
        {
          type: "text",
          text: `Replaced ${replaced}/${occurrences} occurrence(s) in ${params.path}`,
        },
      ],
      details: { path: params.path, occurrences, replaced },
    };
  },
};
