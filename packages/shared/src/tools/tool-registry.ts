// SPDX-License-Identifier: MIT
import { type BaseTool } from "./base-tool";

export class ToolRegistry {
  private tools = new Map<string, BaseTool>();
  private namespaces = new Map<string, Set<string>>();

  register(tool: BaseTool, namespace?: string): void {
    this.tools.set(tool.name, tool);
    if (namespace) {
      if (!this.namespaces.has(namespace)) {
        this.namespaces.set(namespace, new Set());
      }
      this.namespaces.get(namespace)!.add(tool.name);
    }
  }

  registerNamespace(namespace: string, tools: BaseTool[]): void {
    for (const tool of tools) {
      this.register(tool, namespace);
    }
  }

  resolve(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  getByNamespace(namespace: string): BaseTool[] {
    const names = this.namespaces.get(namespace);
    if (!names) return [];
    const results: BaseTool[] = [];
    for (const name of names) {
      const tool = this.tools.get(name);
      if (tool) results.push(tool);
    }
    return results;
  }

  list(): BaseTool[] {
    return Array.from(this.tools.values());
  }
}
