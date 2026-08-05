// SPDX-License-Identifier: MIT
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ITool, ToolContext } from "../../core/ports/tool.port";
import { resolveSafePath } from "./path-safety";

export interface WriteToolParams {
  path: string;
  content: string;
}

export class WriteTool implements ITool {
  readonly name = "write";
  readonly description =
    "Write content to a file. Creates the file if it doesn't exist, and overwrites it if it does. Automatically creates parent directories.";
  readonly parameters = {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to write (relative or absolute)" },
      content: { type: "string", description: "Content to write to the file" },
    },
    required: ["path", "content"],
  };

  constructor(
    private cwd: string,
    private allowedDirs?: string[],
  ) {}

  async execute(toolCallId: string, params: WriteToolParams, ctx?: ToolContext): Promise<any> {
    const { path: filePath, content } = params || {};
    const signal = ctx?.signal;

    if (signal?.aborted) {
      throw new Error("Operation aborted");
    }

    const absolutePath = resolveSafePath(this.cwd, filePath, this.allowedDirs);
    const parentDir = dirname(absolutePath);

    await mkdir(parentDir, { recursive: true });

    if (signal?.aborted) {
      throw new Error("Operation aborted");
    }

    await writeFile(absolutePath, content, "utf-8");

    return {
      content: [
        {
          type: "text",
          text: `Successfully wrote ${Buffer.byteLength(content, "utf-8")} bytes to ${filePath}`,
        },
      ],
      details: {
        path: filePath,
        bytesWritten: Buffer.byteLength(content, "utf-8"),
      },
    };
  }
}

export function createWriteTool(cwd: string, allowedDirs?: string[]): WriteTool {
  return new WriteTool(cwd, allowedDirs);
}
