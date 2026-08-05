import type { TSchema, Static } from "typebox";
import type { ToolContext, ToolResult } from "../types.ts";

export interface ITool<TParams extends TSchema = TSchema, TDetails = unknown> {
  readonly name: string;
  readonly description: string;
  readonly label: string;
  readonly parameters: TParams;
  readonly category?: string;
  readonly requiresApproval?: boolean;

  execute(
    toolCallId: string,
    params: Static<TParams>,
    ctx: ToolContext,
  ): Promise<ToolResult & { details: TDetails }>;
}

export interface IToolRegistry {
  register(tool: ITool): void;
  get(name: string): ITool | undefined;
  list(filter?: { category?: string }): ITool[];
  toAgentTools(): ITool[];
}

export interface IToolExecutor {
  readonly registry: IToolRegistry;
}
