// SPDX-License-Identifier: MIT
import { type BaseTool, type ToolDeclaration, type ToolResult } from "./base-tool";

export interface FunctionToolConfig<T = Record<string, unknown>> {
  name: string;
  description: string;
  schema?: unknown;
  parameters?: Record<string, unknown>;
  execute: (
    toolCallId: string,
    args: T,
    signal?: AbortSignal,
  ) => Promise<ToolResult | string | Record<string, unknown>>;
}

export class FunctionTool<T = Record<string, unknown>> implements BaseTool {
  readonly name: string;
  readonly description: string;
  readonly declaration: ToolDeclaration;
  private readonly executeFn: (
    toolCallId: string,
    args: T,
    signal?: AbortSignal,
  ) => Promise<ToolResult | string | Record<string, unknown>>;

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

  async execute(toolCallId: string, args: unknown, signal?: AbortSignal): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const rawRes = await this.executeFn(toolCallId, args as T, signal);
      const durationMs = Date.now() - startTime;
      if (typeof rawRes === "string") {
        return { content: rawRes, metadata: { durationMs } };
      }
      if (rawRes && typeof rawRes === "object") {
        const resAny = rawRes as any;
        const isError = Boolean(
          resAny.isError ||
            (resAny.exitCode !== undefined && resAny.exitCode !== 0) ||
            (resAny.details?.exitCode !== undefined && resAny.details?.exitCode !== 0),
        );
        const content =
          resAny.content !== undefined
            ? resAny.content
            : resAny.output ?? resAny.text ?? resAny.result ?? JSON.stringify(rawRes);
        const details = resAny.details !== undefined ? resAny.details : rawRes;

        return {
          content,
          details,
          isError,
          errorCode: resAny.errorCode,
          metadata: { durationMs, ...resAny.metadata },
        };
      }
      return {
        content: String(rawRes ?? ""),
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
      execute: async (toolCallId: string, args: any) => {
        const res = await this.execute(toolCallId, args);
        return res.content;
      },
    };
  }
}
