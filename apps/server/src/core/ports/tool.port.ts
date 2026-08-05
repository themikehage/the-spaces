// SPDX-License-Identifier: MIT

export interface ToolContext {
  sessionId?: string;
  toolCallId: string;
  signal?: AbortSignal;
  onUpdate?: (partial: unknown) => void;
}

export interface ITool {
  readonly name: string;
  readonly description: string;
  readonly label?: string;
  readonly parameters?: Record<string, unknown>;
  execute(toolCallId: string, params: any, ctx?: ToolContext): Promise<any>;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface IToolRegistry {
  register(tool: ITool): void;
  get(name: string): ITool | undefined;
  list(): ITool[];
  getActive(): ITool[];
  setActive(tools: ITool[]): void;
  toLLMFormat(): LLMToolDefinition[];
  clear(): void;
}
