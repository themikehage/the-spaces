import type { EnvelopeResult } from "shared";

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

export interface ModelResolutionContext {
  sessionModel?: string;
  agentModel?: string;
  projectModel?: string;
  teamModel?: string;
  userDefaultModel?: string;
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

export interface WorkspaceConfig {
  rules?: string[];
  skills?: string[];
  workflows?: string[];
  defaultModel?: string;
  permissionOverrides?: Record<string, "allow" | "deny" | "ask">;
  toolOverrides?: {
    add?: string[];
    remove?: string[];
  };
}

export interface WorkspaceConfigPort {
  load(workspaceDir: string): Promise<WorkspaceConfig | null>;
}

export interface MemoryPort {
  buildContext(query: string): Promise<string | null>;
  store(key: string, content: string): Promise<void>;
}

export interface McpPort {
  getTools(): Promise<Array<{ name: string; description?: string; parameters?: unknown }>>;
  executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface AgentDirectoryPort {
  getAgentDef(agentId: string): Promise<{ name: string; role: string; systemPrompt: string } | null>;
}

export interface TeamDirectoryPort {
  getTeamDef(teamId: string): Promise<{ name: string; leaderId: string; memberIds: string[] } | null>;
}

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
  config: WorkspaceConfigPort;
  memory?: MemoryPort;
  mcp?: McpPort;
  agents?: AgentDirectoryPort;
  teams?: TeamDirectoryPort;
  scope?: ScopePort;
}
