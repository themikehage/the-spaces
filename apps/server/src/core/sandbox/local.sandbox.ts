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
    if (opts?.signal?.aborted) {
      return {
        stdout: "",
        stderr: "Command aborted by user",
        exitCode: 1,
      };
    }

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
        stdin: opts?.stdin ? "pipe" : undefined,
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    const onAbort = () => {
      try {
        proc.kill();
      } catch {
        /* noop */
      }
    };

    if (opts?.signal) {
      opts.signal.addEventListener("abort", onAbort, { once: true });
    }

    if (opts?.stdin && proc.stdin) {
      proc.stdin.write(opts.stdin);
      proc.stdin.end();
    }

    const readStream = async (
      stream: ReadableStream<Uint8Array>,
      onChunk?: (chunk: string) => void,
    ): Promise<string> => {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        if (onChunk) {
          onChunk(chunk);
        }
      }
      return accumulated;
    };

    const [stdout, stderr] = await Promise.all([
      readStream(proc.stdout as ReadableStream<Uint8Array>, opts?.onStdout),
      readStream(proc.stderr as ReadableStream<Uint8Array>, opts?.onStderr),
    ]);

    const exitCode = await proc.exited;
    if (opts?.signal) {
      opts.signal.removeEventListener("abort", onAbort);
    }

    return { stdout, stderr, exitCode };
  }
}
