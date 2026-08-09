// SPDX-License-Identifier: MIT
import type { AgentDefinition, AgentType } from "shared";

export interface AgentRef {
  type: AgentType;
  id: string;
}

export interface PromptSectionResult {
  title: string;
  content: string;
}

export interface IAgentTypeStrategy {
  getWorkspaceDir(username: string, id: string): string;
  getAgentsMdPath(username: string, id: string): string;
  getParentRef(username: string, id: string): AgentRef | null;
  getDefaultTools(): string[];
  isListable(): boolean;
  buildPromptSection?(target: AgentRef | AgentDefinition, username: string): Promise<PromptSectionResult | null>;
}

export interface IAgentTypeRegistry {
  register(type: AgentType, strategy: IAgentTypeStrategy): void;
  get(type: AgentType): IAgentTypeStrategy;
  has(type: AgentType): boolean;
}
