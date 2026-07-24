// SPDX-License-Identifier: MIT
import type { AgentTool } from "../ai/vendor/agent/src/types.ts";

export class ToolRegistry {
  private activeTools: AgentTool[] = [];
  private allToolsMap: Map<string, AgentTool> = new Map();

  constructor(initialTools: AgentTool[] = []) {
    this.registerTools(initialTools);
  }

  registerTool(tool: AgentTool): void {
    this.allToolsMap.set(tool.name, tool);
    if (!this.activeTools.some((t) => t.name === tool.name)) {
      this.activeTools.push(tool);
    }
  }

  registerTools(tools: AgentTool[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  getTool(name: string): AgentTool | undefined {
    return this.allToolsMap.get(name);
  }

  getActiveTools(): AgentTool[] {
    return [...this.activeTools];
  }

  getAllTools(): AgentTool[] {
    return Array.from(this.allToolsMap.values());
  }

  setActiveTools(tools: AgentTool[]): void {
    this.activeTools = [...tools];
    for (const t of tools) {
      this.allToolsMap.set(t.name, t);
    }
  }

  clear(): void {
    this.activeTools = [];
    this.allToolsMap.clear();
  }
}
