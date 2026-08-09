// SPDX-License-Identifier: MIT
import { existsSync, readFileSync } from "node:fs";
import {
  getAgentAgentsMdPath,
  getAgentWorkspaceDir,
  getGlobalAgentsMdPath,
  getProjectAgentsMdPath,
  getProjectWorkspaceDir,
  getTeamAgentsMdPath,
  getTeamWorkspaceDir,
  getWorkspaceDir,
  type AgentDefinition,
  type AgentType,
} from "shared";
import type { AgentRef, IAgentTypeRegistry, IAgentTypeStrategy, PromptSectionResult } from "../ports/agent-type-registry.port";

export class GlobalStrategy implements IAgentTypeStrategy {
  getWorkspaceDir(username: string, _id: string): string {
    return getWorkspaceDir(username);
  }
  getAgentsMdPath(username: string, _id: string): string {
    return getGlobalAgentsMdPath(username);
  }
  getParentRef(_username: string, _id: string): AgentRef | null {
    return null;
  }
  getDefaultTools(): string[] {
    return [];
  }
  isListable(): boolean {
    return true;
  }
}

export class ProjectStrategy implements IAgentTypeStrategy {
  getWorkspaceDir(username: string, id: string): string {
    return getProjectWorkspaceDir(username, id);
  }
  getAgentsMdPath(username: string, id: string): string {
    return getProjectAgentsMdPath(username, id);
  }
  getParentRef(_username: string, _id: string): AgentRef | null {
    return { type: "global", id: "global" };
  }
  getDefaultTools(): string[] {
    return [];
  }
  isListable(): boolean {
    return true;
  }
  async buildPromptSection(target: AgentRef | AgentDefinition, username: string): Promise<PromptSectionResult | null> {
    const id = "id" in target ? target.id : "global";
    if (!id || id === "global") return null;
    const projectDir = getProjectWorkspaceDir(username, id);
    const projectAgentsMd = getProjectAgentsMdPath(username, id);
    let content = `Project Workspace: ${projectDir}`;
    if (existsSync(projectAgentsMd)) {
      content += `\n\n## Project Directives (.spaces/AGENTS.md)\n` + readFileSync(projectAgentsMd, "utf-8");
    }
    return {
      title: `Project Context (${id})`,
      content,
    };
  }
}

export class TeamStrategy implements IAgentTypeStrategy {
  getWorkspaceDir(username: string, id: string): string {
    return getTeamWorkspaceDir(username, id);
  }
  getAgentsMdPath(username: string, id: string): string {
    return getTeamAgentsMdPath(username, id);
  }
  getParentRef(_username: string, _id: string): AgentRef | null {
    return { type: "global", id: "global" };
  }
  getDefaultTools(): string[] {
    return [];
  }
  isListable(): boolean {
    return true;
  }
  async buildPromptSection(target: AgentRef | AgentDefinition, username: string): Promise<PromptSectionResult | null> {
    const id = "id" in target ? target.id : "global";
    if (!id || id === "global") return null;
    const teamAgentsMd = getTeamAgentsMdPath(username, id);
    let content = `Team ID: ${id}`;
    if (existsSync(teamAgentsMd)) {
      content += `\n\n## Team Directives (.spaces/AGENTS.md)\n` + readFileSync(teamAgentsMd, "utf-8");
    }
    return {
      title: `Team Context (${id})`,
      content,
    };
  }
}

export class WorkspaceStrategy implements IAgentTypeStrategy {
  getWorkspaceDir(username: string, _id: string): string {
    return getWorkspaceDir(username);
  }
  getAgentsMdPath(username: string, _id: string): string {
    return getGlobalAgentsMdPath(username);
  }
  getParentRef(_username: string, _id: string): AgentRef | null {
    return null;
  }
  getDefaultTools(): string[] {
    return [];
  }
  isListable(): boolean {
    return true;
  }
}

export class SubagentStrategy implements IAgentTypeStrategy {
  getWorkspaceDir(username: string, id: string): string {
    return getAgentWorkspaceDir(username, id);
  }
  getAgentsMdPath(username: string, id: string): string {
    return getAgentAgentsMdPath(username, id);
  }
  getParentRef(_username: string, id: string): AgentRef | null {
    return { type: "global", id: "global" };
  }
  getDefaultTools(): string[] {
    return [];
  }
  isListable(): boolean {
    return false;
  }
  async buildPromptSection(target: AgentRef | AgentDefinition, username: string): Promise<PromptSectionResult | null> {
    const id = "id" in target ? target.id : "global";
    if (!id || id === "global") return null;
    const agentMdPath = getAgentAgentsMdPath(username, id);
    let content = "";
    if (existsSync(agentMdPath)) {
      content = readFileSync(agentMdPath, "utf-8");
    }
    return {
      title: `Agent Specific Persona (${id})`,
      content: content || "No custom system prompt defined.",
    };
  }
}

export class WorkflowStrategy implements IAgentTypeStrategy {
  getWorkspaceDir(username: string, id: string): string {
    return getAgentWorkspaceDir(username, id);
  }
  getAgentsMdPath(username: string, id: string): string {
    return getAgentAgentsMdPath(username, id);
  }
  getParentRef(_username: string, _id: string): AgentRef | null {
    return { type: "global", id: "global" };
  }
  getDefaultTools(): string[] {
    return [];
  }
  isListable(): boolean {
    return false;
  }
  async buildPromptSection(target: AgentRef | AgentDefinition, username: string): Promise<PromptSectionResult | null> {
    const id = "id" in target ? target.id : "global";
    if (!id || id === "global") return null;
    const agentMdPath = getAgentAgentsMdPath(username, id);
    let content = "";
    if (existsSync(agentMdPath)) {
      content = readFileSync(agentMdPath, "utf-8");
    }
    return {
      title: `Workflow Agent Persona (${id})`,
      content: content || "Execution agent for workflow.",
    };
  }
}

export class CustomStrategy implements IAgentTypeStrategy {
  getWorkspaceDir(username: string, id: string): string {
    return getAgentWorkspaceDir(username, id);
  }
  getAgentsMdPath(username: string, id: string): string {
    return getAgentAgentsMdPath(username, id);
  }
  getParentRef(_username: string, _id: string): AgentRef | null {
    return { type: "global", id: "global" };
  }
  getDefaultTools(): string[] {
    return [];
  }
  isListable(): boolean {
    return true;
  }
  async buildPromptSection(target: AgentRef | AgentDefinition, username: string): Promise<PromptSectionResult | null> {
    const id = "id" in target ? target.id : "global";
    if (!id || id === "global") return null;
    const agentMdPath = getAgentAgentsMdPath(username, id);
    let content = "";
    if (existsSync(agentMdPath)) {
      content = readFileSync(agentMdPath, "utf-8");
    }
    return {
      title: `Agent Specific Persona (${id})`,
      content: content || "No custom system prompt defined.",
    };
  }
}

export class AgentTypeRegistry implements IAgentTypeRegistry {
  private strategies = new Map<AgentType, IAgentTypeStrategy>();
  private defaultStrategy = new CustomStrategy();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    this.strategies.set("global", new GlobalStrategy());
    this.strategies.set("project", new ProjectStrategy());
    this.strategies.set("team", new TeamStrategy());
    this.strategies.set("workspace", new WorkspaceStrategy());
    this.strategies.set("subagent", new SubagentStrategy());
    this.strategies.set("workflow", new WorkflowStrategy());
    this.strategies.set("custom", new CustomStrategy());
    this.strategies.set("user", new CustomStrategy()); // Alias for retrocompatibility
  }

  register(type: AgentType, strategy: IAgentTypeStrategy): void {
    this.strategies.set(type, strategy);
  }

  get(type?: AgentType): IAgentTypeStrategy {
    if (!type) return this.defaultStrategy;
    return this.strategies.get(type) ?? this.defaultStrategy;
  }

  has(type: AgentType): boolean {
    return this.strategies.has(type);
  }
}

export const agentTypeRegistry = new AgentTypeRegistry();
