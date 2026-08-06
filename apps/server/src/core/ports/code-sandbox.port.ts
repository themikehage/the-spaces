// SPDX-License-Identifier: MIT

export interface CodeSandboxOptions {
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export interface ICodeSandbox {
  executeCode(
    code: string,
    context: Record<string, unknown>,
    options?: CodeSandboxOptions,
  ): Promise<Record<string, unknown>>;
}
