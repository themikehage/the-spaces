// SPDX-License-Identifier: MIT
import { constants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import type { ITool, ToolContext } from "../../core/ports/tool.port";
import {
  applyEditsToNormalizedContent,
  detectLineEnding,
  type Edit,
  generateDiffString,
  generateUnifiedPatch,
  normalizeToLF,
  restoreLineEndings,
  stripBom,
} from "./edit-diff";
import { resolveSafePath } from "./path-safety";

export interface EditToolParams {
  path: string;
  edits: Edit[];
}

export class EditTool implements ITool {
  readonly name = "edit";
  readonly description =
    "Edit a single text file using exact text block replacements. Multiple disjoint replacements can be executed in one call.";
  readonly parameters = {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to edit (relative or absolute)" },
      edits: {
        type: "array",
        description:
          "One or more targeted replacements. oldText must match a unique, non-overlapping region of the file exactly.",
        items: {
          type: "object",
          properties: {
            oldText: {
              type: "string",
              description: "Exact text block to replace. Must be unique in the file.",
            },
            newText: { type: "string", description: "Replacement text." },
          },
          required: ["oldText", "newText"],
        },
      },
    },
    required: ["path", "edits"],
  };

  constructor(
    private cwd: string,
    private allowedDirs?: string[],
  ) {}

  async execute(toolCallId: string, params: EditToolParams, ctx?: ToolContext): Promise<any> {
    const { path: filePath, edits } = params || {};
    const signal = ctx?.signal;

    if (!Array.isArray(edits) || edits.length === 0) {
      throw new Error("edits must contain at least one replacement block.");
    }

    if (signal?.aborted) {
      throw new Error("Operation aborted");
    }

    const absolutePath = resolveSafePath(this.cwd, filePath, this.allowedDirs);

    await access(absolutePath, constants.R_OK | constants.W_OK);

    const buffer = await readFile(absolutePath);
    const rawContent = buffer.toString("utf-8");

    if (signal?.aborted) {
      throw new Error("Operation aborted");
    }

    const { bom, text: content } = stripBom(rawContent);
    const originalEnding = detectLineEnding(content);
    const normalizedContent = normalizeToLF(content);

    const { baseContent, newContent } = applyEditsToNormalizedContent(
      normalizedContent,
      edits as Edit[],
      filePath,
    );

    if (signal?.aborted) {
      throw new Error("Operation aborted");
    }

    const finalContent = bom + restoreLineEndings(newContent, originalEnding);
    await writeFile(absolutePath, finalContent, "utf-8");

    const diffResult = generateDiffString(baseContent, newContent);
    const patch = generateUnifiedPatch(filePath, baseContent, newContent);

    return {
      content: [
        { type: "text", text: `Successfully replaced ${edits.length} block(s) in ${filePath}.` },
      ],
      details: {
        path: filePath,
        diff: diffResult.diff,
        patch,
        firstChangedLine: diffResult.firstChangedLine,
      },
    };
  }
}

export function createEditTool(cwd: string, allowedDirs?: string[]): EditTool {
  return new EditTool(cwd, allowedDirs);
}
