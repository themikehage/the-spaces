// SPDX-License-Identifier: MIT
import type { ISandbox, SandboxOptions, SandboxResult } from "../ports/sandbox.port";
import { isRestrictedPath } from "./restricted-paths";

export class LocalSandbox implements ISandbox {
  constructor(private readonly restrictedPaths: string[] = []) {}

  isAllowed(cmd: string, cwd?: string): boolean {
    if (cwd && isRestrictedPath(cwd, this.restrictedPaths).restricted) return false;
    if (isRestrictedPath(cmd, this.restrictedPaths).restricted) return false;
    return true;
  }

  async execute(cmd: string, opts?: SandboxOptions): Promise<SandboxResult> {
    if (!this.isAllowed(cmd, opts?.cwd)) {
      return {
        stdout: "",
        stderr: "Command or directory is restricted by security policy",
        exitCode: 1,
      };
    }

    const proc = Bun.spawn(
      process.platform === "win32" ? ["cmd.exe", "/c", cmd] : ["sh", "-c", cmd],
      {
        cwd: opts?.cwd || process.cwd(),
        env: { ...process.env, ...opts?.env },
      },
    );

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return { stdout, stderr, exitCode };
  }
}
