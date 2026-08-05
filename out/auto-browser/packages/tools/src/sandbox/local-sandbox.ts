import { spawn } from "bun";
import type { ISandbox, SandboxOptions, SandboxResult } from "@auto-browser/core";
import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

const RESTRICTED_PATHS = [
  "/etc/passwd",
  "/etc/shadow",
  "/etc/sudoers",
  "~/.ssh",
  "~/.aws",
  "~/.config/gcloud",
];

const RESTRICTED_COMMANDS = ["rm -rf /", "dd if=", "mkfs", ":(){:|:&};:"];

function isRestricted(cmd: string): boolean {
  const lower = cmd.toLowerCase();
  return RESTRICTED_COMMANDS.some((r) => lower.includes(r));
}

export class LocalSandbox implements ISandbox {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd ?? process.cwd();
  }

  async execute(cmd: string, opts?: SandboxOptions): Promise<SandboxResult> {
    if (isRestricted(cmd)) {
      return { stdout: "", stderr: "Command blocked by sandbox policy", exitCode: 1 };
    }

    const spawnEnv = opts?.env
      ? ({ ...process.env, ...opts.env } as Record<string, string>)
      : (process.env as Record<string, string>);

    const proc = spawn({
      cmd: ["sh", "-c", cmd],
      cwd: opts?.cwd ?? this.cwd,
      env: spawnEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const timeout = opts?.timeout ?? 30_000;
    const timeoutId = setTimeout(() => proc.kill(), timeout);

    try {
      const [stdoutBuf, stderrBuf, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      return { stdout: stdoutBuf, stderr: stderrBuf, exitCode };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async readFile(path: string): Promise<string> {
    return readFile(path, "utf-8");
  }

  async writeFile(path: string, content: string): Promise<void> {
    await writeFile(path, content, "utf-8");
  }

  async listFiles(pattern: string): Promise<string[]> {
    const results: string[] = [];
    for await (const entry of glob(pattern, { cwd: this.cwd })) {
      results.push(entry);
    }
    return results;
  }
}
