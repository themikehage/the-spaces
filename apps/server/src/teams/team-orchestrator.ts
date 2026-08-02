// SPDX-License-Identifier: MIT
import { OrchestrationRunner } from "./orchestration/orchestration-runner";
import type { ActiveTeamStream } from "./team-prompt-runner";
import { TeamStore } from "./team-store";

type TeamBroadcastFn = (teamId: string, data: any) => void;
let broadcastToTeamFn: TeamBroadcastFn | null = null;

export function setTeamBroadcastHandler(fn: TeamBroadcastFn) {
  broadcastToTeamFn = fn;
}

function broadcast(teamId: string, data: any) {
  broadcastToTeamFn?.(teamId, data);
}

export class TeamOrchestrator {
  private orchestrationRunner: OrchestrationRunner;
  private teamStore: TeamStore;

  constructor(teamStore?: TeamStore) {
    this.teamStore = teamStore ?? new TeamStore();
    this.orchestrationRunner = new OrchestrationRunner(broadcast, this.teamStore);
  }

  getActiveStreams(teamId: string, sessionId?: string): Record<string, ActiveTeamStream> {
    return {};
  }

  abortDispatch(username: string, teamId: string, sessionId?: string): void {
    const team = this.teamStore.getTeam(username, teamId);
    if (!team) return;

    this.orchestrationRunner.abort(username, teamId);
    broadcast(teamId, { type: "team_dispatch_aborted", teamId, sessionId });
  }

  async dispatchUserMessage(
    username: string,
    teamId: string,
    userContent: string,
    sessionId?: string,
  ): Promise<void> {
    const team = this.teamStore.getTeam(username, teamId);
    if (!team) throw new Error("Team not found");

    await this.orchestrationRunner.dispatch(username, teamId, userContent, sessionId);
  }
}
