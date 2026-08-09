import { existsSync } from "node:fs";
import { logBashExecution } from "../../middleware/bash-audit-logger";
import type { ISandbox } from "../../ports/sandbox.port";
import type { ITool, ToolContext } from "../../ports/tool.port";
import { LocalSandbox } from "../../sandbox/local.sandbox";
import { isRestrictedPath } from "../../sandbox/restricted-paths";

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

    const sandbox = this.options?.sandbox ?? new LocalSandbox();

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

    if (abortSignal?.aborted) {
      const finalOutput = (output + errorOutput + "\n[Command aborted by user]").trim();
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
      return {
        exitCode: null,
        output: finalOutput,
        cancelled: true,
      };
    }

    try {
      const res = await sandbox.execute(command, {
        cwd: spawnContext.cwd,
        env: spawnContext.env,
        signal: abortSignal,
        timeout: effectiveTimeout * 1000,
        onStdout: (chunk) => appendData(chunk, false),
        onStderr: (chunk) => appendData(chunk, true),
      });

      if (abortSignal?.aborted) {
        const finalOutput = (output + errorOutput + "\n[Command aborted by user]").trim();
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
        return {
          exitCode: null,
          output: finalOutput,
          cancelled: true,
        };
      }

      let finalOutput = output + errorOutput;
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
        exitCode: res.exitCode,
        outputLength: finalOutput.length,
        truncated,
      });

      return {
        exitCode: res.exitCode,
        output: finalOutput,
        cancelled: false,
      };
    } catch (err: any) {
      const isAborted = abortSignal?.aborted;
      let finalOutput = output + errorOutput;
      if (isAborted) {
        finalOutput += "\n[Command aborted by user]";
      } else {
        finalOutput += `\n[Command failed: ${err?.message || "Execution error"}]`;
      }
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
        cancelled: isAborted,
      });

      return {
        exitCode: null,
        output: finalOutput,
        cancelled: isAborted,
      };
    }
  }
}

export function createBashTool(cwd: string, options?: BashToolOptions): BashTool {
  return new BashTool(cwd, options);
}

export interface ToolDefinition<TParams = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  execute: (
    toolCallIdOrArgs: string | TParams,
    argsOrContext?: TParams | { signal?: AbortSignal; abortSignal?: AbortSignal },
    maybeSignal?: AbortSignal,
  ) => Promise<TResult>;
}

export function createBashToolDefinition(
  cwd: string,
  options?: BashToolOptions,
): ToolDefinition<BashExecuteParams, BashExecuteResult> {
  const tool = createBashTool(cwd, options);
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.parameters,
    execute: async (
      toolCallIdOrArgs: string | BashExecuteParams,
      argsOrContext?: BashExecuteParams | { signal?: AbortSignal; abortSignal?: AbortSignal },
      maybeSignal?: AbortSignal,
    ): Promise<BashExecuteResult> => {
      let command: string;
      let timeout: number | undefined;
      let signal: AbortSignal | undefined;
      let toolCallId = "bash-call";

      if (typeof toolCallIdOrArgs === "string") {
        toolCallId = toolCallIdOrArgs;
        const typedArgs = argsOrContext as BashExecuteParams;
        command = typedArgs?.command;
        timeout = typedArgs?.timeout;
        signal = maybeSignal;
      } else {
        command = toolCallIdOrArgs?.command;
        timeout = toolCallIdOrArgs?.timeout;
        const ctx = argsOrContext as { signal?: AbortSignal; abortSignal?: AbortSignal };
        signal = ctx?.signal || ctx?.abortSignal;
      }

      return tool.execute(toolCallId, { command, timeout }, { toolCallId, signal });
    },
  };
}
