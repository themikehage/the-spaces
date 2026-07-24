// SPDX-License-Identifier: MIT
import { type BaseTool, type ToolDeclaration, type ToolResult } from "./base-tool";

export interface FunctionToolConfig<T = Record<string, unknown>> {
  name: string;
  description: string;
  schema?: unknown;
  parameters?: Record<string, unknown>;
  execute: (args: T, signal?: AbortSignal) => Promise<ToolResult | string | Record<string, unknown>>;
}

export class FunctionTool<T = Record<string, unknown>> implements BaseTool {
  readonly name: string;
  readonly description: string;
  readonly declaration: ToolDeclaration;
  private readonly executeFn: (args: T, signal?: AbortSignal) => Promise<ToolResult | string | Record<string, unknown>>;

  constructor(config: FunctionToolConfig<T>) {
    this.name = config.name;
    this.description = config.description;
    this.declaration = {
      name: config.name,
      description: config.description,
      schema: config.schema,
      parameters: config.parameters,
    };
    this.executeFn = config.execute;
  }

  async execute(args: unknown, signal?: AbortSignal): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const rawRes = await this.executeFn(args as T, signal);
      const durationMs = Date.now() - startTime;
      if (typeof rawRes === "string") {
        return { content: rawRes, metadata: { durationMs } };
      }
      if (rawRes && typeof rawRes === "object" && "content" in rawRes && typeof rawRes.content === "string") {
        return {
          content: rawRes.content,
          isError: Boolean((rawRes as ToolResult).isError),
          errorCode: (rawRes as ToolResult).errorCode,
          metadata: { durationMs, ...(rawRes as ToolResult).metadata },
        };
      }
      return {
        content: JSON.stringify(rawRes),
        metadata: { durationMs },
      };
    } catch (err: any) {
      return {
        content: err?.message || String(err),
        isError: true,
        errorCode: err?.code || "TOOL_EXECUTION_ERROR",
        metadata: { durationMs: Date.now() - startTime },
      };
    }
  }

  toVendorFormat(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      schema: this.declaration.schema || this.declaration.parameters,
      execute: async (args: any) => {
        const res = await this.execute(args);
        return res.content;
      },
    };
  }
}
