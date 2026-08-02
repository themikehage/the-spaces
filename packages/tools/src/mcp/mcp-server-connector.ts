import type { IMcpClientLike } from "./mcp-tool-adapter.js";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  enabled?: boolean;
}

export class McpServerConnector implements IMcpClientLike {
  private connected = false;

  constructor(readonly config: McpServerConfig) {}

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async callTool(_name: string, _args: unknown): Promise<{
    content?: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
    isError?: boolean;
  }> {
    if (!this.connected) {
      throw new Error(`MCP Server ${this.config.name} is not connected`);
    }
    return { content: [{ type: "text", text: "MCP execution result" }] };
  }
}
