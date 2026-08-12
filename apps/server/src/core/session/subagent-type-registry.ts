import type { AutonomyMode } from "shared";
import type { ToolPermissionRule } from "../sandbox/subagent-permissions";

export interface SubagentTypeDefinition {
  id: string;
  label: string;
  systemPromptAppend?: string;
  autonomyMode: AutonomyMode;
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
      id: "readonly",
      label: "Read-Only (Explorer)",
      autonomyMode: "readonly",
      systemPromptAppend: "You are an explorer subagent. Focus on reading and analyzing code.",
    });

    this.register({
      id: "standard",
      label: "Standard (Builder)",
      autonomyMode: "standard",
      systemPromptAppend: "You are a builder subagent. Implement changes accurately.",
    });

    this.register({
      id: "autonomous",
      label: "Autonomous (Full)",
      autonomyMode: "autonomous",
      systemPromptAppend: "You are an autonomous subagent with permission to execute modifications.",
    });
  }

  register(def: SubagentTypeDefinition): void {
    this.types.set(def.id.toLowerCase(), def);
  }

  get(id?: string): SubagentTypeDefinition {
    if (!id) {
      return this.types.get("standard")!;
    }
    const normalized = id.toLowerCase();
    const aliasMap: Record<string, string> = {
      explorer: "readonly",
      builder: "standard",
      "read-only": "readonly",
    };
    const resolvedId = aliasMap[normalized] || normalized;
    const found = this.types.get(resolvedId);
    return found || this.types.get("standard")!;
  }

  list(): SubagentTypeDefinition[] {
    return Array.from(this.types.values());
  }

  has(id: string): boolean {
    const normalized = id.toLowerCase();
    const aliasMap: Record<string, string> = {
      explorer: "readonly",
      builder: "standard",
      "read-only": "readonly",
    };
    return this.types.has(aliasMap[normalized] || normalized);
  }
}

export const subagentTypeRegistry = new SubagentTypeRegistry();

