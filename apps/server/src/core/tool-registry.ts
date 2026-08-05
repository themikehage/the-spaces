// SPDX-License-Identifier: MIT
import type { AgentTool } from "../ai/vendor/agent/src/types.ts";
import type { ITool, IToolRegistry, LLMToolDefinition } from "./ports/tool.port";
import { iToolToAgentTool } from "./tool-adapters";

export class ToolRegistry implements IToolRegistry {
  private activeTools: ITool[] = [];
  private allToolsMap: Map<string, ITool> = new Map();

  constructor(initialTools: (ITool | AgentTool)[] = []) {
    this.registerTools(initialTools);
  }

  register(tool: ITool): void {
    this.registerTool(tool);
  }

  registerTool(tool: ITool | AgentTool): void {
    const iTool: ITool = tool as any;
    this.allToolsMap.set(iTool.name, iTool);
    if (!this.activeTools.some((t) => t.name === iTool.name)) {
      this.activeTools.push(iTool);
    }
  }

  registerTools(tools: (ITool | AgentTool)[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  get(name: string): ITool | undefined {
    return this.allToolsMap.get(name);
  }

  getTool(name: string): ITool | undefined {
    return this.get(name);
  }

  list(): ITool[] {
    return this.getAllTools();
  }

  getActive(): ITool[] {
    return [...this.activeTools];
  }

  getActiveTools(): ITool[] {
    return this.getActive();
  }

  getAllTools(): ITool[] {
    return Array.from(this.allToolsMap.values());
  }

  setActive(tools: ITool[]): void {
    this.setActiveTools(tools);
  }

  setActiveTools(tools: (ITool | AgentTool)[]): void {
    const normalized = tools.map((t) => t as ITool);
    this.activeTools = [...normalized];
    for (const t of normalized) {
      this.allToolsMap.set(t.name, t);
    }
  }

  toLLMFormat(): LLMToolDefinition[] {
    return this.activeTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  // TODO: remove when agent-loop migrates off vendor
  toAgentTools(sessionId: string = ""): AgentTool[] {
    return this.activeTools.map((tool) => iToolToAgentTool(tool, sessionId));
  }

  clear(): void {
    this.activeTools = [];
    this.allToolsMap.clear();
  }
}
