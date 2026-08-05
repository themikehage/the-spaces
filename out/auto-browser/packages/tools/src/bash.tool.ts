import { Type, type Static } from "typebox";
import type { ITool, ToolContext, ToolResult } from "@auto-browser/core";
import { LocalSandbox } from "./sandbox/local-sandbox.ts";

const Parameters = Type.Object({
  command: Type.String({ description: "Shell command to execute" }),
  cwd: Type.Optional(Type.String({ description: "Working directory" })),
  timeout: Type.Optional(Type.Number({ description: "Timeout in milliseconds (default 30000)" })),
});

type Params = Static<typeof Parameters>;

export interface BashDetails {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export const bashTool: ITool<typeof Parameters, BashDetails> = {
  name: "bash",
  label: "Run Shell Command",
  description: "Execute a shell command in the sandbox",
  parameters: Parameters,
  category: "system",

  async execute(
    _toolCallId: string,
    params: Params,
    ctx: ToolContext,
  ): Promise<ToolResult & { details: BashDetails }> {
    const sandbox = new LocalSandbox(params.cwd);
    const result = await sandbox.execute(params.command, {
      cwd: params.cwd,
      timeout: params.timeout,
      signal: ctx.signal,
    } as any);

    const output = [
      result.stdout && `STDOUT:\n${result.stdout}`,
      result.stderr && `STDERR:\n${result.stderr}`,
      `Exit code: ${result.exitCode}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      content: [{ type: "text", text: output }],
      details: result,
    };
  },
};
