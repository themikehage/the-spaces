import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import type { ITool, ToolContext, ToolResult } from "@spaces/core";
import { z } from "zod";
import { resolveSafePath } from "./path-safety.js";

const ReadParametersSchema = z.object({
  path: z.string().describe("Path to the file to read (relative or absolute)"),
  offset: z.number().optional().describe("Line number to start reading from (1-indexed)"),
  limit: z.number().optional().describe("Maximum number of lines to read"),
});

const MAX_READ_BYTES = 50 * 1024; // 50 KB limit for single read output

export const readTool: ITool = {
  name: "read",
  description: "Read the contents of a text file. Supports offset and limit parameters for paginating large files.",
  parameters: ReadParametersSchema,
  category: "filesystem",
  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { path: filePath, offset, limit } = ReadParametersSchema.parse(args);
    const cwd = ctx.workspaceRoot ?? process.cwd();

    try {
      const absolutePath = resolveSafePath(cwd, filePath);
      await access(absolutePath, constants.R_OK);

      const buffer = await readFile(absolutePath);
      const textContent = buffer.toString("utf-8");

      if (textContent.includes("\u0000")) {
        return {
          toolCallId: "",
          output: "[Binary file detected. Reading binary files directly is not supported by this tool.]",
          isError: true,
        };
      }

      const allLines = textContent.split("\n");
      const startLine = offset ? Math.max(0, offset - 1) : 0;
      const startLineDisplay = startLine + 1;

      if (startLine >= allLines.length) {
        return {
          toolCallId: "",
          output: `Error: Offset ${offset} is beyond end of file (${allLines.length} lines total)`,
          isError: true,
        };
      }

      const selectedLines = limit !== undefined
        ? allLines.slice(startLine, startLine + limit)
        : allLines.slice(startLine);

      let outputText = selectedLines.join("\n");
      if (Buffer.byteLength(outputText, "utf-8") > MAX_READ_BYTES) {
        outputText = outputText.slice(0, MAX_READ_BYTES) + "\n\n[Output truncated at 50KB limit.]";
      }

      return {
        toolCallId: "",
        output: outputText,
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
