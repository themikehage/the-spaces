import { Type, type Static } from "typebox";
import type { ITool, ToolContext, ToolResult } from "@auto-browser/core";
import { spawn } from "bun";

const Parameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("open"),
      Type.Literal("snapshot"),
      Type.Literal("click"),
      Type.Literal("fill"),
      Type.Literal("type"),
      Type.Literal("press"),
      Type.Literal("scroll"),
      Type.Literal("wait"),
      Type.Literal("read"),
      Type.Literal("eval"),
      Type.Literal("screenshot"),
      Type.Literal("close"),
    ],
    { description: "Browser action to perform using agent-browser" },
  ),
  url: Type.Optional(Type.String({ description: "URL for 'open' or 'read' actions" })),
  selector: Type.Optional(
    Type.String({ description: "Target selector or ref (e.g. '@e1', '#submit', '.btn')" }),
  ),
  text: Type.Optional(Type.String({ description: "Text content for 'fill' or 'type' actions" })),
  key: Type.Optional(
    Type.String({ description: "Key name for 'press' action (e.g. 'Enter', 'Tab')" }),
  ),
  direction: Type.Optional(
    Type.Union(
      [Type.Literal("up"), Type.Literal("down"), Type.Literal("left"), Type.Literal("right")],
      {
        description: "Scroll direction for 'scroll' action",
      },
    ),
  ),
  js: Type.Optional(Type.String({ description: "JavaScript code for 'eval' action" })),
  session: Type.Optional(Type.String({ description: "Optional custom session identifier" })),
});

type Params = Static<typeof Parameters>;

export interface BrowserNavigateDetails {
  action: string;
  command: string[];
  stdout: string;
  stderr: string;
  exitCode: number;
  url?: string;
  screenshotUrl?: string;
  streamPort?: number;
  streamEnabled?: boolean;
  elapsedMs?: number;
  status?: "launching" | "running" | "done" | "error";
}

function buildCliArgs(params: Params, sessionId: string): { args: string[]; sessionName: string } {
  const args: string[] = [];

  const sessionName =
    params.session && params.session !== "unknown"
      ? params.session
      : sessionId && sessionId !== "unknown"
        ? sessionId
        : "default";

  args.push("--session", sessionName);
  args.push("--idle-timeout", "2m");

  switch (params.action) {
    case "open":
      args.push("open");
      if (params.url) args.push(params.url);
      break;
    case "snapshot":
      args.push("snapshot", "-i");
      break;
    case "click":
      args.push("click", params.selector || "");
      break;
    case "fill":
      args.push("fill", params.selector || "", params.text || "");
      break;
    case "type":
      args.push("type", params.selector || "", params.text || "");
      break;
    case "press":
      args.push("press", params.key || "Enter");
      break;
    case "scroll":
      args.push("scroll", params.direction || "down");
      break;
    case "wait":
      if (params.selector) {
        args.push("wait", params.selector);
      } else if (params.text) {
        args.push("wait", "--text", params.text);
      } else {
        args.push("wait", "1000");
      }
      break;
    case "read":
      args.push("read");
      if (params.url) args.push(params.url);
      break;
    case "eval":
      args.push("eval", params.js || "");
      break;
    case "screenshot":
      args.push("screenshot");
      break;
    case "close":
      args.push("close");
      break;
  }

  return { args, sessionName };
}

async function streamToText(
  stream: ReadableStream<Uint8Array>,
  onData: (chunk: string) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      onData(decoder.decode(value, { stream: true }));
    }
  }
}

async function queryStreamStatus(
  sessionName: string,
  isWin: boolean,
): Promise<{ port?: number; enabled?: boolean }> {
  try {
    const cmd = isWin
      ? ["cmd.exe", "/c", "agent-browser", "--session", sessionName, "stream", "status", "--json"]
      : ["agent-browser", "--session", sessionName, "stream", "status", "--json"];

    const result = Bun.spawnSync({ cmd, stdin: "ignore" });
    const stdout = result.stdout.toString("utf-8").trim();
    if (!stdout) return {};
    const parsed = JSON.parse(stdout) as {
      success?: boolean;
      data?: { enabled?: boolean; port?: number };
      enabled?: boolean;
      port?: number;
    };
    // agent-browser wraps response in { success, data, error }
    const payload = parsed.data ?? parsed;
    return { port: payload.port, enabled: payload.enabled };
  } catch {
    return {};
  }
}

export const browserNavigateTool: ITool<typeof Parameters, BrowserNavigateDetails> = {
  name: "browser_navigate",
  label: "Browser Action",
  description:
    "Control a headless/headed web browser using agent-browser CLI. Supports navigation, snapshot accessibility tree with @refs, click, fill, scroll, screenshot, wait, and eval.",
  parameters: Parameters,
  category: "browser",

  async execute(
    _toolCallId: string,
    params: Params,
    ctx: ToolContext,
  ): Promise<ToolResult & { details: BrowserNavigateDetails }> {
    const { args: cliArgs, sessionName } = buildCliArgs(params, ctx.sessionId);
    const cmdStr = `agent-browser ${cliArgs.join(" ")}`;
    const startTime = Date.now();

    const isWin = process.platform === "win32";

    ctx.onUpdate?.({
      content: [{ type: "text", text: `Launching: ${cmdStr}` }],
      details: {
        action: params.action,
        command: cliArgs,
        stdout: "",
        stderr: "",
        exitCode: 0,
        url: params.url,
        status: "launching",
        elapsedMs: 0,
      },
    });

    const commandToSpawn = isWin
      ? ["cmd.exe", "/c", "agent-browser", ...cliArgs]
      : ["agent-browser", ...cliArgs];

    let proc: any;
    try {
      proc = spawn({
        cmd: commandToSpawn,
        stdin: "ignore",
        stdout: "pipe",
        stderr: "pipe",
      });
    } catch (err: any) {
      const errMsg = `Failed to launch agent-browser CLI: ${err?.message || String(err)}`;
      return {
        content: [{ type: "text", text: errMsg }],
        details: {
          action: params.action,
          command: cliArgs,
          stdout: "",
          stderr: errMsg,
          exitCode: 1,
          url: params.url,
          status: "error",
          elapsedMs: Date.now() - startTime,
        },
      };
    }

    const timeoutMs = 30_000;
    const timeoutId = setTimeout(() => {
      try {
        proc?.kill();
        const closeCmd = isWin
          ? ["cmd.exe", "/c", "agent-browser", "--session", sessionName, "close"]
          : ["agent-browser", "--session", sessionName, "close"];
        spawn({ cmd: closeCmd, stdin: "ignore" });
      } catch (_) {}
    }, timeoutMs);

    // Heartbeat: emit onUpdate every second so the UI stays alive
    let stdoutAcc = "";
    let stderrAcc = "";
    const heartbeat = setInterval(() => {
      const elapsed = Date.now() - startTime;
      ctx.onUpdate?.({
        content: [
          {
            type: "text",
            text: stdoutAcc || stderrAcc || `Working... (${Math.round(elapsed / 1000)}s)`,
          },
        ],
        details: {
          action: params.action,
          command: cliArgs,
          stdout: stdoutAcc,
          stderr: stderrAcc,
          exitCode: 0,
          url: params.url,
          status: "running",
          elapsedMs: elapsed,
        },
      });
    }, 1000);

    if (ctx.signal) {
      if (ctx.signal.aborted) {
        clearTimeout(timeoutId);
        clearInterval(heartbeat);
        try {
          proc?.kill();
          const closeCmd = isWin
            ? ["cmd.exe", "/c", "agent-browser", "--session", sessionName, "close"]
            : ["agent-browser", "--session", sessionName, "close"];
          spawn({ cmd: closeCmd, stdin: "ignore" });
        } catch (_) {}
        return {
          content: [{ type: "text", text: "Action aborted" }],
          details: {
            action: params.action,
            command: cliArgs,
            stdout: "",
            stderr: "Aborted",
            exitCode: 130,
            url: params.url,
            status: "error",
            elapsedMs: Date.now() - startTime,
          },
        };
      }

      ctx.signal.addEventListener("abort", () => {
        try {
          proc?.kill();
          const closeCmd = isWin
            ? ["cmd.exe", "/c", "agent-browser", "--session", sessionName, "close"]
            : ["agent-browser", "--session", sessionName, "close"];
          spawn({ cmd: closeCmd, stdin: "ignore" });
        } catch (_) {}
      });
    }

    const pStdout = streamToText(proc.stdout, (chunk) => {
      stdoutAcc += chunk;
      ctx.onUpdate?.({
        content: [{ type: "text", text: stdoutAcc }],
        details: {
          action: params.action,
          command: cliArgs,
          stdout: stdoutAcc,
          stderr: stderrAcc,
          exitCode: 0,
          url: params.url,
          status: "running",
          elapsedMs: Date.now() - startTime,
        },
      });
    });

    const pStderr = streamToText(proc.stderr, (chunk) => {
      stderrAcc += chunk;
      ctx.onUpdate?.({
        content: [{ type: "text", text: stdoutAcc || stderrAcc }],
        details: {
          action: params.action,
          command: cliArgs,
          stdout: stdoutAcc,
          stderr: stderrAcc,
          exitCode: 0,
          url: params.url,
          status: "running",
          elapsedMs: Date.now() - startTime,
        },
      });
    });

    let exitCode = 0;
    try {
      exitCode = await proc.exited;
      await Promise.all([pStdout, pStderr]);
    } finally {
      clearTimeout(timeoutId);
      clearInterval(heartbeat);
    }

    const stdout = stdoutAcc.trim();
    const stderr = stderrAcc.trim();
    const elapsedMs = Date.now() - startTime;

    // Query stream status after actions that keep the browser open
    const streamableActions = new Set([
      "open",
      "snapshot",
      "click",
      "fill",
      "type",
      "press",
      "scroll",
      "wait",
      "eval",
      "screenshot",
    ]);
    let streamPort: number | undefined;
    let streamEnabled: boolean | undefined;

    if (streamableActions.has(params.action) && exitCode === 0) {
      const streamStatus = await queryStreamStatus(sessionName, isWin);
      streamPort = streamStatus.port;
      streamEnabled = streamStatus.enabled;
    }

    const outputText = stdout || stderr || `Command completed with exit code ${exitCode}`;

    const details: BrowserNavigateDetails = {
      action: params.action,
      command: cliArgs,
      stdout,
      stderr,
      exitCode,
      url: params.url,
      streamPort,
      streamEnabled,
      elapsedMs,
      status: exitCode === 0 ? "done" : "error",
    };

    return {
      content: [{ type: "text", text: outputText }],
      details,
    };
  },
};
