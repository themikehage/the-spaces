// SPDX-License-Identifier: MIT

export interface BashAuditEntry {
  command: string;
  cwd: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  exitCode: number | null;
  outputLength: number;
  truncated: boolean;
  timedOut?: boolean;
  cancelled?: boolean;
  isError?: boolean;
}

export function logBashExecution(entry: BashAuditEntry): void {
  console.log(`[BASH_AUDIT] ${JSON.stringify(entry)}`);
}
