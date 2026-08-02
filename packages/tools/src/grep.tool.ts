import type { ITool, ToolContext, ToolResult } from "@spaces/core";
import ignore from "ignore";
import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { z } from "zod";
import { resolveSafePath } from "./path-safety.js";

const GrepParametersSchema = z.object({
  pattern: z.string().describe("Search pattern (regex or literal string)"),
  path: z.string().optional().describe("Directory or file to search (default: workspace root)"),
  glob: z.string().optional().describe("Filter files by glob pattern, e.g. '*.ts'"),
  ignoreCase: z.boolean().optional().describe("Case-insensitive search (default: false)"),
  literal: z
    .boolean()
    .optional()
    .describe("Treat pattern as literal string instead of regex (default: false)"),
  limit: z.number().optional().describe("Maximum number of matches to return (default: 100)"),
});

function globToRegex(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regexStr =
    "^" + escaped.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".") + "$";
  return new RegExp(regexStr, "i");
}

export const grepTool: ITool = {
  name: "grep",
  description:
    "Search file contents for a pattern. Returns matching lines with file paths and line numbers.",
  parameters: GrepParametersSchema,
  category: "filesystem",
  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const {
      pattern,
      path: searchDir,
      glob: globPattern,
      ignoreCase,
      literal,
      limit,
    } = GrepParametersSchema.parse(args);
    const cwd = ctx.workspaceRoot ?? process.cwd();
    const effectiveLimit = limit && limit > 0 ? limit : 100;

    try {
      const searchPath = resolveSafePath(cwd, searchDir || ".");
      const ig = ignore();
      ig.add(["node_modules", ".git", "pnpm-lock.yaml", "dist", "build"]);

      const gitignorePath = join(cwd, ".gitignore");
      if (existsSync(gitignorePath)) {
        try {
          const gitignoreContent = await readFile(gitignorePath, "utf-8");
          ig.add(gitignoreContent);
        } catch {
          /* noop */
        }
      }

      const files: string[] = [];
      const walk = async (dir: string) => {
        const entries = await readdir(dir);
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const relativeToWorkspace = relative(cwd, fullPath).replace(/\\/g, "/");

          if (ig.ignores(relativeToWorkspace)) continue;

          const entryStat = await stat(fullPath);
          if (entryStat.isDirectory()) {
            await walk(fullPath);
          } else if (entryStat.isFile()) {
            if (globPattern) {
              const globRegex = globToRegex(globPattern);
              if (!globRegex.test(entry)) continue;
            }
            files.push(fullPath);
          }
        }
      };

      const pathStat = await stat(searchPath);
      if (pathStat.isDirectory()) {
        await walk(searchPath);
      } else if (pathStat.isFile()) {
        files.push(searchPath);
      }

      const regex = literal ? null : new RegExp(pattern, ignoreCase ? "i" : "");
      const lowerPattern = literal && ignoreCase ? pattern.toLowerCase() : pattern;

      const matches: string[] = [];
      for (const file of files) {
        if (matches.length >= effectiveLimit) break;
        try {
          const content = await readFile(file, "utf-8");
          if (content.includes("\u0000")) continue; // Skip binary

          const lines = content.split("\n");
          const relativePath = relative(searchPath, file) || basename(file);
          const formattedPath = relativePath.replace(/\\/g, "/");

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let isMatch = false;

            if (regex) {
              isMatch = regex.test(line);
            } else {
              const targetLine = ignoreCase ? line.toLowerCase() : line;
              isMatch = targetLine.includes(lowerPattern);
            }

            if (isMatch) {
              matches.push(`${formattedPath}:${i + 1}: ${line.trim()}`);
              if (matches.length >= effectiveLimit) break;
            }
          }
        } catch {
          /* noop */
        }
      }

      if (matches.length === 0) {
        return {
          toolCallId: "",
          output: "No matches found",
        };
      }

      return {
        toolCallId: "",
        output: matches.join("\n"),
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
