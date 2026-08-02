import type { ITool, ToolContext, ToolResult } from "@spaces/core";
import { constants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import {
  applyEditsToNormalizedContent,
  detectLineEnding,
  type Edit,
  generateDiffString,
  normalizeToLF,
  restoreLineEndings,
  stripBom,
} from "./edit-diff.js";
import { resolveSafePath } from "./path-safety.js";

const EditBlockSchema = z.object({
  oldText: z.string().describe("Exact text block to replace. Must be unique in the file."),
  newText: z.string().describe("Replacement text."),
});

const EditParametersSchema = z.object({
  path: z.string().describe("Path to the file to edit (relative or absolute)"),
  edits: z.array(EditBlockSchema).min(1).describe("One or more targeted replacements."),
});

export const editTool: ITool = {
  name: "edit",
  description:
    "Edit a single text file using exact text block replacements. Multiple disjoint replacements can be executed in one call.",
  parameters: EditParametersSchema,
  requiresApproval: true,
  category: "filesystem",
  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { path: filePath, edits } = EditParametersSchema.parse(args);
    const cwd = ctx.workspaceRoot ?? process.cwd();

    try {
      const absolutePath = resolveSafePath(cwd, filePath);
      await access(absolutePath, constants.R_OK | constants.W_OK);

      const buffer = await readFile(absolutePath);
      const rawContent = buffer.toString("utf-8");

      const { bom, text: content } = stripBom(rawContent);
      const originalEnding = detectLineEnding(content);
      const normalizedContent = normalizeToLF(content);

      const { baseContent, newContent } = applyEditsToNormalizedContent(
        normalizedContent,
        edits as Edit[],
        filePath,
      );

      const finalContent = bom + restoreLineEndings(newContent, originalEnding);
      await writeFile(absolutePath, finalContent, "utf-8");

      const diffResult = generateDiffString(baseContent, newContent);

      return {
        toolCallId: "",
        output: `Successfully replaced ${edits.length} block(s) in ${filePath}.\n\n${diffResult.diff}`,
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
