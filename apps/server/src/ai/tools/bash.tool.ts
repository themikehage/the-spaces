// SPDX-License-Identifier: MIT
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { logBashExecution } from "../../core/middleware/bash-audit-logger";
import type { ISandbox } from "../../core/ports/sandbox.port";
import type { ITool, ToolContext } from "../../core/ports/tool.port";
import { isRestrictedPath } from "../restricted-paths";

const MAX_OUTPUT_BYTES = 50 * 1024; // 50 KB output limit
const DEFAULT_TIMEOUT_SECONDS = 30;

export interface BashSpawnContext {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

export type BashSpawnHook = (context: BashSpawnContext) => BashSpawnContext;

export interface BashToolOptions {
  spawnHook?: BashSpawnHook;
  outputFilter?: (output: string) => string;
  sandbox?: ISandbox;
}

export interface BashExecuteParams {
  command: string;
  timeout?: number;
}

export interface BashExecuteResult {
  exitCode: number | null;
  output: string;
  isError?: boolean;
  cancelled?: boolean;
  timedOut?: boolean;
}

export function verifyCommandSafety(command: string): { safe: boolean; reason?: string } {
  const restrictedCheck = isRestrictedPath(command);
  if (restrictedCheck.restricted) {
    return {
      safe: false,
      reason: `Command attempts to access restricted system directory: ${restrictedCheck.matchedPath}`,
    };
  }

  const protectedPorts = [
    process.env.PORT ?? "3000",
    process.env.PREVIEW_PORT ?? "3001",
    "4104",
    "5173",
  ]
    .map((p) => parseInt(p, 10))
    .filter((p) => !isNaN(p));

  const pid = process.pid;
  const lowerCmd = command.toLowerCase();

  const killKeywords = ["kill", "taskkill", "stop-process", "fuser", "pkill", "killall"];
  const hasKillKeyword = killKeywords.some((kw) => new RegExp(`\\b${kw}\\b`, "i").test(command));

  if (hasKillKeyword) {
    const pidRegex = new RegExp(`\\b${pid}\\b`);
    if (pidRegex.test(lowerCmd)) {
      return {
        safe: false,
        reason: `Command attempts to terminate the current server process (PID: ${pid}) which runs the agent platform.`,
      };
    }

    for (const port of protectedPorts) {
      const portRegex = new RegExp(`\\b${port}\\b`);
      if (portRegex.test(lowerCmd)) {
        return {
          safe: false,
          reason: `Command attempts to terminate processes associated with protected infrastructure port: ${port}.`,
        };
      }
    }
  }

  for (const port of protectedPorts) {
    const portRegex = new RegExp(`\\b${port}\\b`);
    if (portRegex.test(lowerCmd)) {
      const networkKeywords = ["netstat", "lsof", "fuser", "get-nettcpconnection", "owningprocess"];
      const hasNetworkKeyword = networkKeywords.some((nw) => lowerCmd.includes(nw));
      if (
        hasNetworkKeyword &&
        (hasKillKeyword ||
          lowerCmd.includes("stop") ||
          lowerCmd.includes("force") ||
          lowerCmd.includes("-k"))
      ) {
        return {
          safe: false,
          reason: `Command matches a dangerous pattern that targets infrastructure port: ${port}.`,
        };
      }
    }
  }

  return { safe: true };
}

export class BashTool implements ITool {
  readonly name = "bash";
  readonly description =
    "Run commands in a bash shell or terminal. Use this to run builds, tests, or scripts.";
  readonly parameters = {
    type: "object",
    properties: {
      command: { type: "string", description: "The command to run" },
      timeout: { type: "number", description: "Timeout in seconds" },
    },
    required: ["command"],
  };

  constructor(
    private cwd: string,
    private options?: BashToolOptions,
  ) {}

  async execute(
    toolCallId: string,
    params: BashExecuteParams,
    ctx?: ToolContext,
  ): Promise<BashExecuteResult> {
    const startTime = Date.now();
    const command = params?.command;
    const timeout = params?.timeout;
    const abortSignal = ctx?.signal;

    const effectiveTimeout = timeout && timeout > 0 ? timeout : DEFAULT_TIMEOUT_SECONDS;

    const safety = verifyCommandSafety(command || "");
    if (!safety.safe) {
      const res: BashExecuteResult = {
        exitCode: 1,
        output: `Security Policy Error: Command execution rejected. ${safety.reason}`,
        isError: true,
      };
      logBashExecution({
        command: command || "",
        cwd: this.cwd,
        startTime,
        endTime: Date.now(),
        durationMs: Date.now() - startTime,
        exitCode: 1,
        outputLength: res.output.length,
        truncated: false,
        isError: true,
      });
      return res;
    }

    if (!existsSync(this.cwd)) {
      const res: BashExecuteResult = {
        exitCode: 1,
        output: `Error: Working directory does not exist: ${this.cwd}`,
        isError: true,
      };
      logBashExecution({
        command,
        cwd: this.cwd,
        startTime,
        endTime: Date.now(),
        durationMs: Date.now() - startTime,
        exitCode: 1,
        outputLength: res.output.length,
        truncated: false,
        isError: true,
      });
      return res;
    }

    let shell = "bash";
    let shellArgs: string[] = ["-c", command];

    if (process.platform === "win32") {
      shell = "powershell.exe";
      shellArgs = ["-NoProfile", "-NonInteractive", "-Command", command];
    }

    let spawnContext: BashSpawnContext = {
      command: shell,
      args: shellArgs,
      cwd: this.cwd,
      env: { ...process.env } as Record<string, string>,
    };

    if (this.options?.spawnHook) {
      spawnContext = this.options.spawnHook(spawnContext);
    }

    return new Promise((resolve) => {
      const child = spawn(spawnContext.command, spawnContext.args, {
        cwd: spawnContext.cwd,
        env: spawnContext.env,
        windowsHide: true,
      });

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

      child.stdout.on("data", (data) => {
        appendData(data.toString(), false);
      });

      child.stderr.on("data", (data) => {
        appendData(data.toString(), true);
      });

      const sig = abortSignal;
      const onAbort = () => {
        try {
          child.kill();
        } catch {
          /* noop */
        }
        let finalOutput = output + errorOutput + "\n[Command aborted by user]";
        if (truncated) {
          finalOutput += "\n[...output truncated at 50KB limit]";
        }
        if (this.options?.outputFilter) {
          finalOutput = this.options.outputFilter(finalOutput);
        }
        const endTime = Date.now();
        logBashExecution({
          command,
          cwd: this.cwd,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          exitCode: null,
          outputLength: finalOutput.length,
          truncated,
          cancelled: true,
        });
        resolve({
          exitCode: null,
          output: finalOutput,
          cancelled: true,
        });
      };

      if (sig) {
        if (sig.aborted) {
          onAbort();
          return;
        }
        sig.addEventListener("abort", onAbort);
      }

      const timeoutHandle = setTimeout(() => {
        try {
          child.kill();
        } catch {
          /* noop */
        }
        let finalOutput =
          output + errorOutput + `\n[Command timed out after ${effectiveTimeout} seconds]`;
        if (truncated) {
          finalOutput += "\n[...output truncated at 50KB limit]";
        }
        if (this.options?.outputFilter) {
          finalOutput = this.options.outputFilter(finalOutput);
        }
        const endTime = Date.now();
        logBashExecution({
          command,
          cwd: this.cwd,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          exitCode: null,
          outputLength: finalOutput.length,
          truncated,
          timedOut: true,
        });
        resolve({
          exitCode: null,
          output: finalOutput,
          timedOut: true,
        });
      }, effectiveTimeout * 1000);

      child.on("close", (code) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (abortSignal) {
          abortSignal.removeEventListener("abort", onAbort);
        }

        let finalOutput = output + errorOutput;
        if (truncated) {
          finalOutput += "\n[...output truncated at 50KB limit]";
        }
        if (this.options?.outputFilter) {
          finalOutput = this.options.outputFilter(this.options.outputFilter(finalOutput));
        }

        const endTime = Date.now();
        logBashExecution({
          command,
          cwd: this.cwd,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          exitCode: code,
          outputLength: finalOutput.length,
          truncated,
        });

        resolve({
          exitCode: code,
          output: finalOutput,
          cancelled: false,
        });
      });

      child.on("error", (err) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (abortSignal) {
          abortSignal.removeEventListener("abort", onAbort);
        }
        const finalOutput = `Failed to spawn shell process: ${err.message}`;
        const endTime = Date.now();
        logBashExecution({
          command,
          cwd: this.cwd,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          exitCode: 1,
          outputLength: finalOutput.length,
          truncated: false,
          isError: true,
        });
        resolve({
          exitCode: 1,
          output: finalOutput,
          isError: true,
        });
      });
    });
  }
}

export function createBashTool(cwd: string, options?: BashToolOptions): BashTool {
  return new BashTool(cwd, options);
}
