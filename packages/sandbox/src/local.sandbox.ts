import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { dirname, join, isAbsolute } from "node:path";
import type { ISandbox, SandboxOptions, SandboxResult } from "@spaces/core";
import { isRestrictedPath } from "./restricted-paths";

const MAX_OUTPUT_BYTES = 50 * 1024; // 50 KB output limit
const DEFAULT_TIMEOUT_MS = 30 * 1000; // 30 seconds

export class LocalSandbox implements ISandbox {
  private readonly defaultCwd: string;

  constructor(defaultCwd: string = process.cwd()) {
    this.defaultCwd = defaultCwd;
  }

  async execute(cmd: string, opts?: SandboxOptions): Promise<SandboxResult> {
    const safety = isRestrictedPath(cmd);
    if (safety.restricted) {
      throw new Error(`Command blocked by restricted path rule: ${safety.matchedPath}`);
    }

    // Protect against killing the current process
    const pid = process.pid;
    const lowerCmd = cmd.toLowerCase();
    const killKeywords = ["kill", "taskkill", "stop-process", "pkill", "killall"];
    if (killKeywords.some((kw) => lowerCmd.includes(kw)) && lowerCmd.includes(String(pid))) {
      throw new Error(`Command attempts to terminate current process (PID ${pid})`);
    }

    const cwd = opts?.cwd ?? this.defaultCwd;
    const timeout = opts?.timeout ?? DEFAULT_TIMEOUT_MS;
    const env = { ...process.env, ...opts?.env };

    const isWindows = process.platform === "win32";
    const shell = isWindows ? "cmd.exe" : "/bin/sh";
    const shellArgs = isWindows ? ["/d", "/s", "/c", cmd] : ["-c", cmd];

    return new Promise<SandboxResult>((resolve) => {
      let stdoutBuf = "";
      let stderrBuf = "";
      let totalBytes = 0;

      const child = spawn(shell, shellArgs, {
        cwd,
        env,
        windowsVerbatimArguments: isWindows,
      });

      const timer = setTimeout(() => {
        child.kill();
        resolve({
          stdout: stdoutBuf,
          stderr: stderrBuf + "\n[Execution timed out]",
          exitCode: 124,
        });
      }, timeout);

      child.stdout.on("data", (data: Buffer) => {
        if (totalBytes < MAX_OUTPUT_BYTES) {
          const chunk = data.toString("utf-8");
          stdoutBuf += chunk;
          totalBytes += data.length;
        }
      });

      child.stderr.on("data", (data: Buffer) => {
        if (totalBytes < MAX_OUTPUT_BYTES) {
          const chunk = data.toString("utf-8");
          stderrBuf += chunk;
          totalBytes += data.length;
        }
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          stdout: stdoutBuf,
          stderr: stderrBuf + `\n[Process error: ${err.message}]`,
          exitCode: 1,
        });
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({
          stdout: stdoutBuf,
          stderr: stderrBuf,
          exitCode: code ?? 0,
        });
      });
    });
  }

  async readFile(path: string): Promise<string> {
    const targetPath = isAbsolute(path) ? path : join(this.defaultCwd, path);
    const safety = isRestrictedPath(targetPath);
    if (safety.restricted) {
      throw new Error(`Access to restricted path blocked: ${safety.matchedPath}`);
    }
    return await readFile(targetPath, "utf-8");
  }

  async writeFile(path: string, content: string): Promise<void> {
    const targetPath = isAbsolute(path) ? path : join(this.defaultCwd, path);
    const safety = isRestrictedPath(targetPath);
    if (safety.restricted) {
      throw new Error(`Write to restricted path blocked: ${safety.matchedPath}`);
    }
    const dir = dirname(targetPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(targetPath, content, "utf-8");
  }

  async listFiles(pattern: string): Promise<string[]> {
    // If Bun glob is available, use it
    if (typeof globalThis !== "undefined" && "Bun" in globalThis && (globalThis as any).Bun?.Glob) {
      const glob = new (globalThis as any).Bun.Glob(pattern);
      const matches: string[] = [];
      for await (const file of glob.scan({ cwd: this.defaultCwd })) {
        matches.push(file);
      }
      return matches;
    }

    // Fallback: simple recursive readdir filter
    const matches: string[] = [];
    const scanDir = async (dir: string) => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && !entry.name.startsWith(".")) {
            await scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const relative = fullPath.replace(this.defaultCwd, "").replace(/^[/\\]/, "");
          if (!pattern || relative.includes(pattern) || pattern === "*") {
            matches.push(relative);
          }
        }
      }
    };

    await scanDir(this.defaultCwd);
    return matches;
  }
}
