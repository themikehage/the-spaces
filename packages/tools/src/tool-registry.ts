import {
  type ITool,
  type IToolRegistry,
  type LLMToolDefinition,
  zodToJsonSchema,
} from "@spaces/core";

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
      return {
        name: t.name,
        description: t.description,
        parameters: zodToJsonSchema(t.parameters),
      };
    });
  }
}
