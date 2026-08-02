import type { IAgentRuntime, IModelProvider, ISessionStore } from "@spaces/core";
import { createAgent, DelegationHook } from "@spaces/engine";
import { TeamContext, type TeamConfig } from "./team-context.js";

export function createTeamAgent(
  config: TeamConfig,
  deps: { sessionStore: ISessionStore; modelProvider: IModelProvider },
): { teamAgent: IAgentRuntime; teamContext: TeamContext } {
  const teamContext = new TeamContext();

  for (const member of config.members) {
    const memberAgent = createAgent(`${config.id}-${member.id}`, {
      sessionStore: deps.sessionStore,
      modelProvider: deps.modelProvider,
    });
    teamContext.registerSubAgent(member.id, memberAgent);
  }

  const delegationHook = new DelegationHook(teamContext.getAllSubAgents());
  const teamAgent = createAgent(config.id, {
    sessionStore: deps.sessionStore,
    modelProvider: deps.modelProvider,
    hooks: [delegationHook],
  });

  return { teamAgent, teamContext };
}
