import type { ITool, IToolRegistry, LLMToolDefinition } from "@spaces/core";

export class DefaultToolRegistry implements IToolRegistry {
  private tools = new Map<string, ITool>();

  register(tool: ITool): void {
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

  toLLMFormat(): LLMToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => {
      const shape = (t.parameters as any)?._def?.shape?.() ?? (t.parameters as any)?.shape ?? {};
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = {
          type: "string",
          description: (value as any)?.description ?? "",
        };
        if (!(value as any)?.isOptional?.()) {
          required.push(key);
        }
      }

      return {
        name: t.name,
        description: t.description,
        parameters: {
          type: "object",
          properties,
          required,
        },
      };
    });
  }
}
