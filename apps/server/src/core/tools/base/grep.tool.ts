// SPDX-License-Identifier: MIT
import ignore from "ignore";
import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type { ITool, ToolContext } from "../../ports/tool.port";
import { LocalSandbox } from "../../sandbox/local.sandbox";
import { resolveSafePath } from "./path-safety";

async function isRipgrepAvailable(): Promise<boolean> {
  try {
    const res = await new LocalSandbox().execute(
      process.platform === "win32" ? "where rg" : "which rg",
    );
    return res.exitCode === 0;
  } catch {
    return false;
  }
}

function globToRegex(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regexStr =
    "^" + escaped.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".") + "$";
  return new RegExp(regexStr, "i");
}

export interface GrepToolParams {
  pattern: string;
  path?: string;
  glob?: string;
  ignoreCase?: boolean;
  literal?: boolean;
  limit?: number;
}

export class GrepTool implements ITool {
  readonly name = "grep";
  readonly description =
    "Search file contents for a pattern. Returns matching lines with file paths and line numbers. Respects .gitignore.";
  readonly parameters = {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Search pattern (regex or literal string)" },
      path: {
        type: "string",
        description: "Directory or file to search (default: current directory)",
      },
      glob: { type: "string", description: "Filter files by glob pattern, e.g. '*.ts'" },
      ignoreCase: { type: "boolean", description: "Case-insensitive search (default: false)" },
      literal: {
        type: "boolean",
        description: "Treat pattern as literal string instead of regex (default: false)",
      },
      limit: {
        type: "number",
        description: "Maximum number of matches to return (default: 100)",
      },
    },
    required: ["pattern"],
  };

  constructor(
    private cwd: string,
    private allowedDirs?: string[],
  ) {}

  async execute(toolCallId: string, params: GrepToolParams, ctx?: ToolContext): Promise<any> {
    const {
      pattern,
      path: searchDir,
      glob: globPattern,
      ignoreCase,
      literal,
      limit,
    } = params || {};
    const signal = ctx?.signal;
    const effectiveLimit = limit && limit > 0 ? limit : 100;
    const searchPath = resolveSafePath(this.cwd, searchDir || ".", this.allowedDirs);

    if (signal?.aborted) {
      throw new Error("Operation aborted");
    }

    if (await isRipgrepAvailable()) {
      try {
        return await runRipgrep(searchPath, pattern, {
          globPattern,
          ignoreCase,
          literal,
          limit: effectiveLimit,
          signal,
        });
      } catch {
        // Fallback to native if spawning fails
      }
    }

    return runNativeGrep(this.cwd, searchPath, pattern, {
      globPattern,
      ignoreCase,
      literal,
      limit: effectiveLimit,
      signal,
    });
  }
}

export function createGrepTool(cwd: string, allowedDirs?: string[]): GrepTool {
  return new GrepTool(cwd, allowedDirs);
}

export function createGrepToolDefinition(cwd: string, allowedDirs?: string[]) {
  const tool = createGrepTool(cwd, allowedDirs);
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    execute: (toolCallId: string, args: any, signal?: AbortSignal) =>
      tool.execute(toolCallId, args, { toolCallId, signal }),
  };
}

async function runRipgrep(
  searchPath: string,
  pattern: string,
  opts: {
    globPattern?: string;
    ignoreCase?: boolean;
    literal?: boolean;
    limit: number;
    signal?: AbortSignal;
  },
): Promise<any> {
  const args = ["--line-number", "--color=never", "--with-filename", "--no-heading"];
  if (opts.ignoreCase) args.push("-i");
  if (opts.literal) args.push("-F");
  if (opts.globPattern) args.push("-g", opts.globPattern);
  args.push("--max-count", String(opts.limit));
  args.push("--", `"${pattern}"`, `"${searchPath}"`);

  const cmd = `rg ${args.join(" ")}`;
  const sandbox = new LocalSandbox();
  const res = await sandbox.execute(cmd, { signal: opts.signal });

  if (res.exitCode !== 0 && res.exitCode !== 1) {
    throw new Error(res.stderr.trim() || `rg exited with code ${res.exitCode}`);
  }

  const lines = res.stdout.split("\n").filter(Boolean);
  const matches = lines.slice(0, opts.limit).map((line) => {
    const parts = line.split(":");
    if (parts.length >= 3) {
      const filePath = parts.slice(0, parts.length - 2).join(":");
      const lineNum = parts[parts.length - 2];
      const text = parts.slice(parts.length - 1).join(":");
      const relativePath = relative(searchPath, filePath) || basename(filePath);
      return `${relativePath.replace(/\\/g, "/")}:${lineNum}: ${text}`;
    }
    return line;
  });

  if (matches.length === 0) {
    return { content: [{ type: "text", text: "No matches found" }], details: { count: 0 } };
  } else {
    return {
      content: [{ type: "text", text: matches.join("\n") }],
      details: { count: matches.length },
    };
  }
}

async function runNativeGrep(
  workspaceDir: string,
  searchPath: string,
  pattern: string,
  opts: {
    globPattern?: string;
    ignoreCase?: boolean;
    literal?: boolean;
    limit: number;
    signal?: AbortSignal;
  },
): Promise<any> {
  const ig = ignore();
  ig.add(["node_modules", ".git", ".atl", "pnpm-lock.yaml", "bun.lockb", "dist", "build"]);

  const gitignorePath = join(workspaceDir, ".gitignore");
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
    if (opts.signal?.aborted) return;
    const entries = await readdir(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relativeToWorkspace = relative(workspaceDir, fullPath).replace(/\\/g, "/");

      if (ig.ignores(relativeToWorkspace)) {
        continue;
      }

      const entryStat = await stat(fullPath);
      if (entryStat.isDirectory()) {
        await walk(fullPath);
      } else if (entryStat.isFile()) {
        if (opts.globPattern) {
          const globRegex = globToRegex(opts.globPattern);
          if (!globRegex.test(entry)) {
            continue;
          }
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

  const regex = opts.literal ? null : new RegExp(pattern, opts.ignoreCase ? "i" : "");
  const lowerPattern = opts.literal && opts.ignoreCase ? pattern.toLowerCase() : pattern;

  const matches: string[] = [];
  for (const file of files) {
    if (opts.signal?.aborted) break;
    if (matches.length >= opts.limit) break;

    try {
      const content = await readFile(file, "utf-8");
      if (content.includes("\u0000")) continue; // Skip binaries

      const lines = content.split("\n");
      const relativePath = relative(searchPath, file) || basename(file);
      const formattedPath = relativePath.replace(/\\/g, "/");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let isMatch = false;

        if (regex) {
          isMatch = regex.test(line);
        } else {
          const targetLine = opts.ignoreCase ? line.toLowerCase() : line;
          isMatch = targetLine.includes(lowerPattern);
        }

        if (isMatch) {
          matches.push(`${formattedPath}:${i + 1}: ${line.trim()}`);
          if (matches.length >= opts.limit) break;
        }
      }
    } catch {
      /* noop */
    }
  }

  if (matches.length === 0) {
    return { content: [{ type: "text", text: "No matches found" }], details: { count: 0 } };
  }

  return {
    content: [{ type: "text", text: matches.join("\n") }],
    details: { count: matches.length },
  };
}
