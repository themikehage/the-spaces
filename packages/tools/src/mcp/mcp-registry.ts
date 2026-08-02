import type { IToolRegistry } from "@spaces/core";
import { McpServerConnector, type McpServerConfig } from "./mcp-server-connector.js";
import { McpToolAdapter } from "./mcp-tool-adapter.js";

export class McpRegistry {
  private connectors = new Map<string, McpServerConnector>();

  registerServer(config: McpServerConfig): McpServerConnector {
    const connector = new McpServerConnector(config);
    this.connectors.set(config.id, connector);
    return connector;
  }

  getConnector(id: string): McpServerConnector | undefined {
    return this.connectors.get(id);
  }

  async registerTools(serverId: string, tools: Array<{ name: string; description?: string; inputSchema?: unknown }>, targetRegistry: IToolRegistry): Promise<void> {
    const connector = this.connectors.get(serverId);
    if (!connector) return;
    for (const toolDef of tools) {
      targetRegistry.register(new McpToolAdapter(connector, serverId, toolDef));
    }
  }

  async disconnectAll(): Promise<void> {
    for (const connector of this.connectors.values()) {
      await connector.disconnect();
    }
    this.connectors.clear();
  }
}
