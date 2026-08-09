// SPDX-License-Identifier: MIT

export interface SandboxOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  stdin?: string;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
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
