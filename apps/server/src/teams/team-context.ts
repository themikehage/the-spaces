import type { IAgentRuntime } from "@spaces/core";

export interface TeamMemberConfig {
  id: string;
  name: string;
  role: string;
}

export interface TeamConfig {
  id: string;
  name: string;
  members: TeamMemberConfig[];
}

export class TeamContext {
  private subAgents = new Map<string, IAgentRuntime>();

  registerSubAgent(id: string, agent: IAgentRuntime): void {
    this.subAgents.set(id, agent);
  }

  getSubAgent(id: string): IAgentRuntime | undefined {
    return this.subAgents.get(id);
  }

  getAllSubAgents(): Map<string, IAgentRuntime> {
    return this.subAgents;
  }
}
