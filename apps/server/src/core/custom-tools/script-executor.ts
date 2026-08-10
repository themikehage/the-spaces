// SPDX-License-Identifier: MIT
import { existsSync } from "node:fs";
import { extname, join } from "node:path";

export interface ScriptExecutionOptions {
  toolDir: string;
  file?: string;
  params: Record<string, unknown>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ScriptExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  outputData?: unknown;
}

export async function executeCustomToolScript(
  options: ScriptExecutionOptions,
): Promise<ScriptExecutionResult> {
  const { toolDir, file = "scripts/execute.js", params, timeoutMs = 30000, signal } = options;
  const scriptPath = join(toolDir, file);

  if (!existsSync(scriptPath)) {
    throw new Error(`Script file not found: ${file} in ${toolDir}`);
  }

  const ext = extname(scriptPath).toLowerCase();
  let cmd: string[];

  if (ext === ".js" || ext === ".ts") {
    cmd = ["bun", "run", scriptPath];
  } else if (ext === ".sh") {
    cmd = [process.platform === "win32" ? "bash" : "/bin/bash", scriptPath];
  } else if (ext === ".py") {
    cmd = ["python", scriptPath];
  } else {
    cmd = ["bun", "run", scriptPath];
  }

  const jsonParams = JSON.stringify(params);
  const proc = Bun.spawn(cmd, {
    cwd: toolDir,
    env: {
      ...process.env,
      SPACES_TOOL_PARAMS: jsonParams,
    },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  if (proc.stdin) {
    proc.stdin.write(jsonParams);
    proc.stdin.flush();
    proc.stdin.end();
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Script execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    if (signal && typeof signal.addEventListener === "function") {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        proc.kill();
        reject(new Error("Script execution aborted by caller"));
      });
    }
  });

  const executionPromise = (async () => {
    const stdoutStr = await new Response(proc.stdout).text();
    const stderrStr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    let outputData: unknown;
    try {
      outputData = JSON.parse(stdoutStr.trim());
    } catch {
      outputData = undefined;
    }

    return {
      stdout: stdoutStr,
      stderr: stderrStr,
      exitCode,
      outputData,
    };
  })();

  return Promise.race([executionPromise, timeoutPromise]);
}
