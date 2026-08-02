import type { ITool, ToolContext, ToolResult } from "@spaces/core";
import { z, type ZodSchema } from "zod";

export interface CustomToolDefinition {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  handler: (args: unknown) => Promise<unknown>;
}

export class CustomToolAdapter implements ITool {
  readonly name: string;
  readonly description: string;
  readonly parameters: ZodSchema;
  readonly category = "Custom";

  constructor(private def: CustomToolDefinition) {
    this.name = def.name;
    this.description = def.description;
    this.parameters = z.record(z.string(), z.unknown());
  }

  async execute(args: unknown, _ctx: ToolContext): Promise<ToolResult> {
    try {
      const res = await this.def.handler(args);
      const output = typeof res === "string" ? res : JSON.stringify(res);
      return { toolCallId: "", output, isError: false };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { toolCallId: "", output: "", isError: true };
    }
  }
}
