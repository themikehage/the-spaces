import type { ZodSchema } from "zod";
import type { ToolCall, ToolContext, ToolResult } from "../types.js";

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ITool {
  readonly name: string;
  readonly description: string;
  readonly parameters: ZodSchema;
  readonly category?: string;
  readonly requiresApproval?: boolean;
  execute(args: unknown, ctx: ToolContext): Promise<ToolResult>;
}

export interface IToolRegistry {
  register(tool: ITool): void;
  get(name: string): ITool | undefined;
  list(filter?: { category?: string }): ITool[];
  toLLMFormat(): LLMToolDefinition[];
}

export interface IToolExecutor {
  getRegistry(): IToolRegistry;
  execute(toolCall: ToolCall, ctx: ToolContext): Promise<ToolResult>;
}
