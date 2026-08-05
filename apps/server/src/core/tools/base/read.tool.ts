// SPDX-License-Identifier: MIT
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import type { ITool, ToolContext } from "../../ports/tool.port";
import { truncateHead } from "../../../vendor/agent/src/harness/utils/truncate";
import { resolveSafePath } from "./path-safety";

export interface ReadToolParams {
  path: string;
  offset?: number;
  limit?: number;
}

export class ReadTool implements ITool {
  readonly name = "read";
  readonly description =
    "Read the contents of a text file. Supports offset and limit parameters for paginating large files.";
  readonly parameters = {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to read (relative or absolute)" },
      offset: { type: "number", description: "Line number to start reading from (1-indexed)" },
      limit: { type: "number", description: "Maximum number of lines to read" },
    },
    required: ["path"],
  };

  constructor(
    private cwd: string,
    private allowedDirs?: string[],
  ) {}

  async execute(toolCallId: string, params: ReadToolParams, ctx?: ToolContext): Promise<any> {
    const { path: filePath, offset, limit } = params || {};
    const signal = ctx?.signal;

    if (signal?.aborted) {
      throw new Error("Operation aborted");
    }

    const absolutePath = resolveSafePath(this.cwd, filePath, this.allowedDirs);

    await access(absolutePath, constants.R_OK);

    const buffer = await readFile(absolutePath);
    const textContent = buffer.toString("utf-8");

    if (textContent.includes("\u0000")) {
      return {
        content: [
          {
            type: "text",
            text: "[Binary file detected. Reading binary files directly is not supported by this tool.]",
          },
        ],
        details: { isBinary: true },
      };
    }

    const allLines = textContent.split("\n");
    const startLine = offset ? Math.max(0, offset - 1) : 0;
    const startLineDisplay = startLine + 1;

    if (startLine >= allLines.length) {
      throw new Error(`Offset ${offset} is beyond end of file (${allLines.length} lines total)`);
    }

    let selectedContent: string;
    if (limit !== undefined) {
      const endLine = Math.min(startLine + limit, allLines.length);
      selectedContent = allLines.slice(startLine, endLine).join("\n");
    } else {
      selectedContent = allLines.slice(startLine).join("\n");
    }

    const truncation = truncateHead(selectedContent);
    let outputText = truncation.content;

    if (truncation.firstLineExceedsLimit) {
      outputText = `[Line ${startLineDisplay} exceeds byte limit. Try reading with a smaller limit or offset.]`;
    } else if (truncation.truncated) {
      const endLineDisplay = startLineDisplay + truncation.outputLines - 1;
      const nextOffset = endLineDisplay + 1;
      outputText =
        truncation.content +
        `\n\n[Output truncated due to size limits. Use offset=${nextOffset} to continue reading.]`;
    }

    return {
      content: [{ type: "text", text: outputText }],
      details: {
        totalLines: allLines.length,
        outputLines: truncation.outputLines,
        truncated: truncation.truncated,
      },
    };
  }
}

export function createReadTool(cwd: string, allowedDirs?: string[]): ReadTool {
  return new ReadTool(cwd, allowedDirs);
}

export function createReadToolDefinition(cwd: string, allowedDirs?: string[]) {
  const tool = createReadTool(cwd, allowedDirs);
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    execute: (toolCallId: string, args: any, signal?: AbortSignal) =>
      tool.execute(toolCallId, args, { toolCallId, signal }),
  };
}
