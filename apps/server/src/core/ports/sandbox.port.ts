// SPDX-License-Identifier: MIT

export interface SandboxOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ISandbox {
  execute(cmd: string, opts?: SandboxOptions): Promise<SandboxResult>;
  isAllowed(cmd: string, cwd?: string): boolean;
}
