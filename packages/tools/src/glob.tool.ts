import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type { ITool, ToolContext, ToolResult } from "@spaces/core";
import ignore from "ignore";
import { z } from "zod";
import { resolveSafePath } from "./path-safety.js";

const GlobParametersSchema = z.object({
  pattern: z.string().describe("Glob pattern to match files, e.g. '*.ts' or 'src/**/*.json'"),
  path: z.string().optional().describe("Directory to search in (default: workspace root)"),
  limit: z.number().optional().describe("Maximum number of results to return (default: 1000)"),
});

function globToRegex(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regexStr =
    "^" + escaped.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".") + "$";
  return new RegExp(regexStr, "i");
}

export const globTool: ITool = {
  name: "glob",
  description: "Search for files by glob pattern. Returns matching file paths relative to search directory.",
  parameters: GlobParametersSchema,
  category: "filesystem",
  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { pattern, path: searchDir, limit } = GlobParametersSchema.parse(args);
    const cwd = ctx.workspaceRoot ?? process.cwd();
    const effectiveLimit = limit && limit > 0 ? limit : 1000;

    try {
      const searchPath = resolveSafePath(cwd, searchDir || ".");
      const ig = ignore();
      ig.add(["node_modules", ".git", "pnpm-lock.yaml", "dist", "build"]);

      const gitignorePath = join(cwd, ".gitignore");
      if (existsSync(gitignorePath)) {
        try {
          const gitignoreContent = await readFile(gitignorePath, "utf-8");
          ig.add(gitignoreContent);
        } catch { /* noop */ }
      }

      const results: string[] = [];
      const globRegex = globToRegex(pattern);

      const walk = async (dir: string) => {
        if (results.length >= effectiveLimit) return;
        const entries = await readdir(dir);

        for (const entry of entries) {
          if (results.length >= effectiveLimit) break;
          const fullPath = join(dir, entry);
          const relativeToWorkspace = relative(cwd, fullPath).replace(/\\/g, "/");

          if (ig.ignores(relativeToWorkspace)) continue;

          const entryStat = await stat(fullPath);
          if (entryStat.isDirectory()) {
            await walk(fullPath);
          } else if (entryStat.isFile()) {
            const relativeToSearch = relative(searchPath, fullPath).replace(/\\/g, "/");
            if (globRegex.test(relativeToSearch) || globRegex.test(entry)) {
              results.push(relativeToSearch);
            }
          }
        }
      };

      const pathStat = await stat(searchPath);
      if (pathStat.isDirectory()) {
        await walk(searchPath);
      } else if (pathStat.isFile()) {
        const relativeToSearch = relative(searchPath, searchPath) || basename(searchPath);
        if (globRegex.test(relativeToSearch) || globRegex.test(basename(searchPath))) {
          results.push(relativeToSearch);
        }
      }

      if (results.length === 0) {
        return {
          toolCallId: "",
          output: "No files found matching pattern",
        };
      }

      return {
        toolCallId: "",
        output: results.join("\n"),
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
