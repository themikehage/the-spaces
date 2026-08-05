import type { ITool, IToolRegistry, IToolExecutor } from "@auto-browser/core";

export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, ITool>();

  register(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  list(filter?: { category?: string }): ITool[] {
    const all = Array.from(this.tools.values());
    if (!filter?.category) return all;
    return all.filter((t) => t.category === filter.category);
  }

  toAgentTools(): ITool[] {
    return Array.from(this.tools.values());
  }
}

export class ToolExecutor implements IToolExecutor {
  readonly registry: IToolRegistry;

  constructor(registry: IToolRegistry) {
    this.registry = registry;
  }
}
