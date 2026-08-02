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

export interface LegacyToolResult {
  content: string | any[];
  details?: Record<string, unknown>;
  isError?: boolean;
  errorCode?: string;
  metadata?: ToolResultMetadata;
}

export interface BaseTool {
  readonly name: string;
  readonly description: string;
  readonly declaration: ToolDeclaration;
  execute(toolCallId: string, args: unknown, signal?: AbortSignal): Promise<LegacyToolResult>;
  toVendorFormat?(): Record<string, unknown>;
}

export function legacyToolToBaseTool(obj: any): BaseTool {
  if (obj && typeof obj === "object" && typeof obj.execute === "function" && "declaration" in obj) {
    return obj as BaseTool;
  }

  const name = obj?.name || "unnamed_tool";
  const description = obj?.description || "";
  const schema = obj?.schema || obj?.parameters;
  const executeFn = obj?.execute;

  return {
    name,
    description,
    declaration: { name, description, parameters: schema },
    execute: async (toolCallId: string, args: any, signal?: AbortSignal) => {
      if (typeof executeFn === "function") {
        if (executeFn.length >= 2) {
          return await executeFn(toolCallId || "call_legacy", args, signal);
        }
        return await executeFn(args, signal);
      }
      return { content: "" };
    },
  };
}
