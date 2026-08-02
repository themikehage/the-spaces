import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ITool, ToolContext, ToolResult } from "@spaces/core";
import { z } from "zod";
import { resolveSafePath } from "./path-safety.js";

const WriteParametersSchema = z.object({
  path: z.string().describe("Path to the file to write (relative or absolute)"),
  content: z.string().describe("Content to write to the file"),
});

export const writeTool: ITool = {
  name: "write",
  description: "Write content to a file. Creates the file if it doesn't exist, and overwrites it if it does. Automatically creates parent directories.",
  parameters: WriteParametersSchema,
  requiresApproval: true,
  category: "filesystem",
  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { path: filePath, content } = WriteParametersSchema.parse(args);
    const cwd = ctx.workspaceRoot ?? process.cwd();

    try {
      const absolutePath = resolveSafePath(cwd, filePath);
      const parentDir = dirname(absolutePath);

      await mkdir(parentDir, { recursive: true });
      await writeFile(absolutePath, content, "utf-8");

      const bytesWritten = Buffer.byteLength(content, "utf-8");
      return {
        toolCallId: "",
        output: `Successfully wrote ${bytesWritten} bytes to ${filePath}`,
      };
    } catch (err) {
      return {
        toolCallId: "",
        output: err instanceof Error ? err.message : String(err),
        isError: true,
      };
    }
  },
};
