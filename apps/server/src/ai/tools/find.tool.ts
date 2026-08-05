// SPDX-License-Identifier: MIT
import ignore from "ignore";
import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type { ITool, ToolContext } from "../../core/ports/tool.port";
import { resolveSafePath } from "./path-safety";

function isFdAvailable(): boolean {
  try {
    execSync(process.platform === "win32" ? "where fd" : "which fd", { stdio: "ignore" });
    return true;
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

    if (isFdAvailable()) {
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

async function runFd(
  searchPath: string,
  pattern: string,
  opts: { limit: number; signal?: AbortSignal },
): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = ["--glob", "--color=never", "--max-results", String(opts.limit)];

    let effectivePattern = pattern;
    if (pattern.includes("/")) {
      args.push("--full-path");
      if (!pattern.startsWith("/") && !pattern.startsWith("**/") && pattern !== "**") {
        effectivePattern = `**/${pattern}`;
      }
    }
    args.push("--", effectivePattern, searchPath);

    const child = spawn("fd", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    const onAbort = () => {
      child.kill();
      reject(new Error("Operation aborted"));
    };

    if (opts.signal) {
      if (opts.signal.aborted) {
        onAbort();
        return;
      }
      opts.signal.addEventListener("abort", onAbort, { once: true });
    }

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (opts.signal) {
        opts.signal.removeEventListener("abort", onAbort);
      }

      if (code !== 0) {
        reject(new Error(stderr.trim() || `fd exited with code ${code}`));
        return;
      }

      const lines = stdout.split("\n").filter(Boolean);
      const results = lines.slice(0, opts.limit).map((line) => {
        const relativePath = relative(searchPath, line) || basename(line);
        return relativePath.replace(/\\/g, "/");
      });

      if (results.length === 0) {
        resolve({
          content: [{ type: "text", text: "No files found matching pattern" }],
          details: { count: 0 },
        });
      } else {
        resolve({
          content: [{ type: "text", text: results.join("\n") }],
          details: { count: results.length },
        });
      }
    });

    child.on("error", (err) => {
      if (opts.signal) {
        opts.signal.removeEventListener("abort", onAbort);
      }
      reject(err);
    });
  });
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
