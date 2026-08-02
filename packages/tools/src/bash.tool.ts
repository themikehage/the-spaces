import type { ITool, ToolContext, ToolResult } from "@spaces/core";
import { z } from "zod";
import { executeBashCommand } from "./bash-executor.js";

const BashParametersSchema = z.object({
  command: z.string().describe("The command to run in shell/terminal"),
  timeout: z.number().optional().describe("Timeout in seconds"),
});

export const bashTool: ITool = {
  name: "bash",
  description: "Run commands in a bash shell or terminal. Use this to run builds, tests, or scripts.",
  parameters: BashParametersSchema,
  requiresApproval: true,
  category: "system",
  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { command, timeout } = BashParametersSchema.parse(args);
    const cwd = ctx.workspaceRoot ?? process.cwd();
    const result = await executeBashCommand({ command, cwd, timeout });

    return {
      toolCallId: "",
      output: result.output,
      isError: result.isError ?? (result.exitCode !== null && result.exitCode !== 0),
    };
  },
};
