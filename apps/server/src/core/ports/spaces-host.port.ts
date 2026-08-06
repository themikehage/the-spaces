// SPDX-License-Identifier: MIT
import type { EnvelopeResult, IArtifactStore, IMemoryStore, ISessionStore } from "shared";
import type { ModelResolutionContext } from "./model-resolver";
import type { WorkspaceConfig } from "./workspace-config.port";

export interface WorkspaceFs {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  listDir(path: string): Promise<string[]>;
}

export interface EnvStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

export interface ModelRegistryPort {
  resolveModel(ctx: ModelResolutionContext): string | undefined;
}

export interface EventBus {
  emit(event: string, payload: unknown): void;
  on(event: string, handler: (payload: unknown) => void): () => void;
}

export interface ApprovalPort {
  requestApproval(params: {
    sessionId: string;
    action: string;
    description: string;
    details?: Record<string, unknown>;
  }): Promise<boolean>;
}

export interface DelegationPort {
  spawn(params: {
    parentSessionId: string;
    targetAgentId: string;
    task: string;
    username: string;
  }): Promise<EnvelopeResult>;
  delegate(params: {
    parentSessionId: string;
    targetAgentId: string;
    task: string;
    username: string;
  }): Promise<EnvelopeResult>;
}

export interface MemoryPort {
  buildContext(query: string): Promise<string | null>;
  store(key: string, content: string): Promise<void>;
}

export interface McpPort {
  getTools(): Promise<Array<{ name: string; description?: string; parameters?: unknown }>>;
  executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface AgentCapabilities {
  model?: { provider: string; modelId: string };
  activeTools: string[];
  skills: string[];
  tags: string[];
  description?: string;
}

export interface AgentDirectoryEntry {
  agentId: string;
  name: string;
  isActive: boolean;
  capabilities: AgentCapabilities;
}

export interface AgentDirectoryPort {
  getAgentDef(agentId: string): Promise<{ name: string; systemPrompt: string } | null>;
  listAgents(
    username: string,
    filter?: {
      tags?: string[];
      hasCapability?: string;
    },
  ): Promise<AgentDirectoryEntry[]>;
  getAgentCapabilities(username: string, agentId: string): Promise<AgentCapabilities | null>;
}

export interface TeamDirectoryPort {
  getTeamDef(
    teamId: string,
  ): Promise<{ name: string; leaderId: string; memberIds: string[] } | null>;
}

import type { IWorkflowEngine } from "./workflow-engine.port";

export interface ScopePort {
  resolveProjectDir(username: string, projectId?: string): string | null;
}

export interface SpacesHost {
  fs: WorkspaceFs;
  env: EnvStore;
  models: ModelRegistryPort;
  events: EventBus;
  approvals: ApprovalPort;
  delegations: DelegationPort;
  config: {
    load(workspaceDir: string): Promise<WorkspaceConfig | null>;
  };
  stores?: {
    session?: ISessionStore;
    artifact?: IArtifactStore;
    memory?: IMemoryStore;
  };
  memory?: MemoryPort;
  mcp?: McpPort;
  agents?: AgentDirectoryPort;
  teams?: TeamDirectoryPort;
  scope?: ScopePort;
  workflows?: IWorkflowEngine;
}
