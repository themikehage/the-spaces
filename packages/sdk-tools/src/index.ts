import type { SpacesHost } from "@spaces/sdk-core";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (toolCallId: string, args: any) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;
}

export type ToolFactory = (host: SpacesHost, options?: Record<string, unknown>) => ToolDefinition;

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  public register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}
