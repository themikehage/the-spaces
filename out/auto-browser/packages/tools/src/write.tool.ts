import { Type, type Static } from "typebox";
import type { ITool, ToolContext, ToolResult } from "@auto-browser/core";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const Parameters = Type.Object({
  path: Type.String({ description: "Path to write to" }),
  content: Type.String({ description: "Content to write" }),
  create_dirs: Type.Optional(
    Type.Boolean({ description: "Create parent directories if they don't exist (default true)" }),
  ),
});

type Params = Static<typeof Parameters>;

export const writeTool: ITool<typeof Parameters> = {
  name: "write",
  label: "Write File",
  description: "Write content to a file, creating parent directories as needed",
  parameters: Parameters,
  category: "filesystem",

  async execute(_toolCallId: string, params: Params, _ctx: ToolContext): Promise<ToolResult> {
    if (params.create_dirs !== false) {
      await mkdir(dirname(params.path), { recursive: true });
    }

    await writeFile(params.path, params.content, "utf-8");

    return {
      content: [{ type: "text", text: `Written ${params.content.length} bytes to ${params.path}` }],
      details: { path: params.path, bytes: params.content.length },
    };
  },
};
