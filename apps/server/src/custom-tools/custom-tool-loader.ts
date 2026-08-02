import type { IToolRegistry } from "@spaces/core";
import { CustomToolAdapter, type CustomToolDefinition } from "@spaces/tools";

export class CustomToolLoader {
  private entityTools = new Map<string, CustomToolDefinition[]>();

  registerTool(entityId: string, toolDef: CustomToolDefinition): void {
    const list = this.entityTools.get(entityId) ?? [];
    list.push(toolDef);
    this.entityTools.set(entityId, list);
  }

  loadIntoRegistry(entityId: string, registry: IToolRegistry): void {
    const tools = this.entityTools.get(entityId) ?? [];
    for (const toolDef of tools) {
      registry.register(new CustomToolAdapter(toolDef));
    }
  }
}
