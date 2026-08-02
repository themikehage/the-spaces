import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const MAX_OUTPUT_BYTES = 50 * 1024; // 50 KB limit
const DEFAULT_TIMEOUT_SECONDS = 30;

export interface BashExecuteParams {
  command: string;
  cwd: string;
  timeout?: number;
  signal?: AbortSignal;
}

export interface BashExecuteResult {
  exitCode: number | null;
  output: string;
  isError?: boolean;
  cancelled?: boolean;
  timedOut?: boolean;
}

const DEFAULT_RESTRICTED_PATHS = [
  "/etc",
  "/proc",
  "/sys",
  "/dev",
  "~/.ssh",
  "C:\\Windows\\System32",
  "C:\\Windows\\SysWOW64",
];

export function verifyCommandSafety(command: string): { safe: boolean; reason?: string } {
  const lowerCmd = command.toLowerCase();
  for (const path of DEFAULT_RESTRICTED_PATHS) {
    const normalized = path.toLowerCase().replace(/\\/g, "/");
    if (lowerCmd.includes(normalized) || lowerCmd.includes(path.toLowerCase())) {
      return {
        safe: false,
        reason: `Command attempts to access restricted system directory: ${path}`,
      };
    }
  }

  const pid = process.pid;
  const killKeywords = ["kill", "taskkill", "stop-process", "fuser", "pkill", "killall"];
  const hasKillKeyword = killKeywords.some((kw) => new RegExp(`\\b${kw}\\b`, "i").test(command));

  if (hasKillKeyword && new RegExp(`\\b${pid}\\b`).test(lowerCmd)) {
    return {
      safe: false,
      reason: `Command attempts to terminate current process (PID: ${pid}).`,
    };
  }

  return { safe: true };
}

export function executeBashCommand(params: BashExecuteParams): Promise<BashExecuteResult> {
  const { command, cwd, timeout, signal } = params;
  const effectiveTimeout = timeout && timeout > 0 ? timeout : DEFAULT_TIMEOUT_SECONDS;

  const safety = verifyCommandSafety(command);
  if (!safety.safe) {
    return Promise.resolve({
      exitCode: 1,
      output: `Security Policy Error: ${safety.reason}`,
      isError: true,
    });
  }

  if (!existsSync(cwd)) {
    return Promise.resolve({
      exitCode: 1,
      output: `Error: Working directory does not exist: ${cwd}`,
      isError: true,
    });
  }

  let shell = "bash";
  let shellArgs = ["-c", command];
  if (process.platform === "win32") {
    shell = "powershell.exe";
    shellArgs = ["-NoProfile", "-NonInteractive", "-Command", command];
  }

  return new Promise((resolve) => {
    const child = spawn(shell, shellArgs, { cwd, env: { ...process.env }, windowsHide: true });
    let output = "";
    let errorOutput = "";
    let truncated = false;

    const appendData = (dataStr: string, isStderr: boolean) => {
      const currentTotal = output.length + errorOutput.length;
      if (currentTotal >= MAX_OUTPUT_BYTES) {
        truncated = true;
        return;
      }
      if (currentTotal + dataStr.length > MAX_OUTPUT_BYTES) {
        const allowed = MAX_OUTPUT_BYTES - currentTotal;
        const slice = dataStr.slice(0, allowed);
        if (isStderr) errorOutput += slice;
        else output += slice;
        truncated = true;
      } else {
        if (isStderr) errorOutput += dataStr;
        else output += dataStr;
      }
    };

    child.stdout?.on("data", (data) => appendData(data.toString(), false));
    child.stderr?.on("data", (data) => appendData(data.toString(), true));

    const onAbort = () => {
      try {
        child.kill();
      } catch {
        // ignore kill error
      }
      let finalOutput = output + errorOutput + "\n[Command aborted by user]";
      if (truncated) finalOutput += "\n[...output truncated at 50KB limit]";
      resolve({ exitCode: null, output: finalOutput, cancelled: true });
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort);
    }

    const timeoutHandle = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // ignore kill error
      }
      let finalOutput = output + errorOutput + `\n[Command timed out after ${effectiveTimeout}s]`;
      if (truncated) finalOutput += "\n[...output truncated at 50KB limit]";
      resolve({ exitCode: null, output: finalOutput, timedOut: true });
    }, effectiveTimeout * 1000);

    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      if (signal) signal.removeEventListener("abort", onAbort);
      let finalOutput = output + errorOutput;
      if (truncated) finalOutput += "\n[...output truncated at 50KB limit]";
      resolve({ exitCode: code, output: finalOutput, cancelled: false });
    });

    child.on("error", (err) => {
      clearTimeout(timeoutHandle);
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve({ exitCode: 1, output: `Failed to spawn process: ${err.message}`, isError: true });
    });
  });
}
