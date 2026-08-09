// SPDX-License-Identifier: MIT
import ignore from "ignore";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type { ITool, ToolContext } from "../../ports/tool.port";
import { LocalSandbox } from "../../sandbox/local.sandbox";
import { resolveSafePath } from "./path-safety";

async function isFdAvailable(): Promise<boolean> {
  try {
    const res = await new LocalSandbox().execute(
      process.platform === "win32" ? "where fd" : "which fd",
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

export interface FindToolParams {
  pattern: string;
  path?: string;
  limit?: number;
}

export class FindTool implements ITool {
  readonly name = "find";
  readonly description =
    "Search for files by glob pattern. Returns matching file paths relative to the search directory. Respects .gitignore.";
  readonly parameters = {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Glob pattern to match files, e.g. '*.ts' or 'src/**/*.json'",
      },
      path: {
        type: "string",
        description: "Directory to search in (default: current directory)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 1000)",
      },
    },
    required: ["pattern"],
  };

  constructor(
    private cwd: string,
    private allowedDirs?: string[],
  ) {}

  async execute(toolCallId: string, params: FindToolParams, ctx?: ToolContext): Promise<any> {
    const { pattern, path: searchDir, limit } = params || {};
    const signal = ctx?.signal;
    const effectiveLimit = limit && limit > 0 ? limit : 1000;
    const searchPath = resolveSafePath(this.cwd, searchDir || ".", this.allowedDirs);

    if (signal?.aborted) {
      throw new Error("Operation aborted");
    }

    if (await isFdAvailable()) {
      try {
        return await runFd(searchPath, pattern, { limit: effectiveLimit, signal });
      } catch {
        // Fallback to native
      }
    }

    return runNativeFind(this.cwd, searchPath, pattern, { limit: effectiveLimit, signal });
  }
}

export function createFindTool(cwd: string, allowedDirs?: string[]): FindTool {
  return new FindTool(cwd, allowedDirs);
}

export function createFindToolDefinition(cwd: string, allowedDirs?: string[]) {
  const tool = createFindTool(cwd, allowedDirs);
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    execute: (toolCallId: string, args: any, signal?: AbortSignal) =>
      tool.execute(toolCallId, args, { toolCallId, signal }),
  };
}

async function runFd(
  searchPath: string,
  pattern: string,
  opts: { limit: number; signal?: AbortSignal },
): Promise<any> {
  const args = ["--glob", "--color=never", "--max-results", String(opts.limit)];

  let effectivePattern = pattern;
  if (pattern.includes("/")) {
    args.push("--full-path");
    if (!pattern.startsWith("/") && !pattern.startsWith("**/") && pattern !== "**") {
      effectivePattern = `**/${pattern}`;
    }
  }
  args.push("--", `"${effectivePattern}"`, `"${searchPath}"`);

  const cmd = `fd ${args.join(" ")}`;
  const sandbox = new LocalSandbox();
  const res = await sandbox.execute(cmd, { signal: opts.signal });

  if (res.exitCode !== 0) {
    throw new Error(res.stderr.trim() || `fd exited with code ${res.exitCode}`);
  }

  const lines = res.stdout.split("\n").filter(Boolean);
  const results = lines.slice(0, opts.limit).map((line) => {
    const relativePath = relative(searchPath, line) || basename(line);
    return relativePath.replace(/\\/g, "/");
  });

  if (results.length === 0) {
    return {
      content: [{ type: "text", text: "No files found matching pattern" }],
      details: { count: 0 },
    };
  } else {
    return {
      content: [{ type: "text", text: results.join("\n") }],
      details: { count: results.length },
    };
  }
}

async function runNativeFind(
  workspaceDir: string,
  searchPath: string,
  pattern: string,
  opts: { limit: number; signal?: AbortSignal },
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

  const results: string[] = [];
  const globRegex = globToRegex(pattern);

  const walk = async (dir: string) => {
    if (opts.signal?.aborted) return;
    if (results.length >= opts.limit) return;

    const entries = await readdir(dir);
    for (const entry of entries) {
      if (results.length >= opts.limit) break;

      const fullPath = join(dir, entry);
      const relativeToWorkspace = relative(workspaceDir, fullPath).replace(/\\/g, "/");

      if (ig.ignores(relativeToWorkspace)) {
        continue;
      }

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
      content: [{ type: "text", text: "No files found matching pattern" }],
      details: { count: 0 },
    };
  }

  return {
    content: [{ type: "text", text: results.join("\n") }],
    details: { count: results.length },
  };
}
