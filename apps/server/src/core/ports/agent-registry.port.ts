// SPDX-License-Identifier: MIT
import type { AgentDefinition, AgentInfo, AgentRef } from "shared";

export interface IAgentEntry {
  username: string;
  server: any;
  status: "starting" | "idle" | "streaming" | "error";
  createdAt: string;
}

export interface IAgentRegistry {
  init(): Promise<void>;
  get(id: string, username?: string): IAgentEntry | undefined;
  list(username: string): AgentInfo[];
  listScoped(username: string, parentType: "projects", parentId: string): AgentInfo[];
  register(
    username: string,
    definition: AgentDefinition,
    saveToDisk?: boolean,
    scope?: AgentRef,
  ): Promise<IAgentEntry>;
  update(username: string, id: string, updates: Partial<AgentDefinition>): Promise<IAgentEntry>;
  stop(id: string, removeDisk?: boolean): Promise<void>;
  getAvatarPath(username: string, id: string): string | null;
  setAvatarUrl(username: string, id: string, avatarUrl: string | null): void;
  reloadUserAgents(username: string): Promise<void>;
  getWorkflowAgent(username: string, workflowId: string): IAgentEntry | undefined;
  getTeamDefinition(username: string, teamId: string): AgentDefinition | undefined;
  listTeamDefinitions(username: string): AgentDefinition[];
}

