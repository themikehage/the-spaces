// SPDX-License-Identifier: MIT

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  schema?: unknown;
}

export interface ToolResultMetadata {
  durationMs?: number;
  tokensUsed?: number;
  artifacts?: string[];
  [key: string]: unknown;
}

export interface ToolResult {
  content: string;
  isError?: boolean;
  errorCode?: string;
  metadata?: ToolResultMetadata;
}

export interface BaseTool {
  readonly name: string;
  readonly description: string;
  readonly declaration: ToolDeclaration;
  execute(toolCallId: string, args: unknown, signal?: AbortSignal): Promise<ToolResult>;
  toVendorFormat?(): Record<string, unknown>;
}
