import type { ToolPermissionRule } from "../sandbox/subagent-permissions";

export interface SubagentTypeDefinition {
  id: string;
  label: string;
  systemPromptAppend?: string;
  permissionProfile: "explorer" | "builder" | "autonomous" | "custom";
  customRules?: ToolPermissionRule[];
  excludedTools?: string[];
}

export class SubagentTypeRegistry {
  private types = new Map<string, SubagentTypeDefinition>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register({
      id: "explorer",
      label: "Explorer (Read-Only)",
      permissionProfile: "explorer",
      systemPromptAppend: "You are an explorer subagent. Focus on reading and analyzing code.",
    });

    this.register({
      id: "builder",
      label: "Builder (Standard)",
      permissionProfile: "builder",
      systemPromptAppend: "You are a builder subagent. Implement changes accurately.",
    });

    this.register({
      id: "autonomous",
      label: "Autonomous (Full)",
      permissionProfile: "autonomous",
      systemPromptAppend: "You are an autonomous subagent with permission to execute modifications.",
    });
  }

  register(def: SubagentTypeDefinition): void {
    this.types.set(def.id.toLowerCase(), def);
  }

  get(id?: string): SubagentTypeDefinition {
    if (!id) {
      return this.types.get("builder")!;
    }
    const found = this.types.get(id.toLowerCase());
    return found || this.types.get("builder")!;
  }

  list(): SubagentTypeDefinition[] {
    return Array.from(this.types.values());
  }

  has(id: string): boolean {
    return this.types.has(id.toLowerCase());
  }
}

export const subagentTypeRegistry = new SubagentTypeRegistry();
