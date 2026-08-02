// SPDX-License-Identifier: MIT
import { SessionPrefix } from "@spaces/core";
import { AgentRegistry } from "../../agents";
import { DelegationRegistry } from "../../core/delegation-registry";
import type { ISessionResolver } from "../../core/ports/core-services.port";
import { SessionMetadataStore } from "../../core/session/metadata-store";
import { TeamStore } from "../team-store";

type BroadcastFn = (teamId: string, data: any) => void;

interface ActiveBridge {
  sessionId: string | undefined;
  accumulatedText: string;
  unsub: (() => void) | null;
}

export class OrchestrationRunner {
  private activeBridges = new Map<string, ActiveBridge>();
  private broadcastFn: BroadcastFn;
  private sessionResolver?: ISessionResolver;
  private teamStore: TeamStore;
  private agentRegistry: AgentRegistry;
  private sessionMetadataStore: SessionMetadataStore;
  private delegationRegistry: DelegationRegistry;

  constructor(
    broadcastFn: BroadcastFn,
    teamStore?: TeamStore,
    agentRegistry?: AgentRegistry,
    sessionMetadataStore?: SessionMetadataStore,
    delegationRegistry?: DelegationRegistry,
    resolver?: ISessionResolver,
  ) {
    this.broadcastFn = broadcastFn;
    this.teamStore = teamStore ?? new TeamStore();
    this.agentRegistry = agentRegistry ?? new AgentRegistry();
    this.sessionMetadataStore = sessionMetadataStore ?? new SessionMetadataStore();
    this.delegationRegistry = delegationRegistry ?? new DelegationRegistry();
    this.sessionResolver = resolver;
  }

  async dispatch(
    username: string,
    teamId: string,
    userContent: string,
    conversationSessionId?: string,
  ): Promise<void> {
    const team = this.teamStore.getTeam(username, teamId);
    if (!team) throw new Error("Team not found");

    const leader = team.members.find((m: any) => m.role === "lead");
    if (!leader) throw new Error("Orchestration leader not found");

    const leaderEntry = this.agentRegistry.get(leader.agentId);
    const leaderName = leaderEntry?.server.definition.name ?? leader.agentId;

    const ownerSessionId = `${SessionPrefix.TEAM}${teamId}`;

    const now = new Date().toISOString();
    const metaStore = this.sessionMetadataStore;
    if (!metaStore.getSessionMetadata(username, ownerSessionId)) {
      metaStore.saveSessionMetadata(username, ownerSessionId, {
        name: `${team.name} — Orchestration`,
        createdAt: now,
        updatedAt: now,
        agentId: leader.agentId,
        teamId: team.id,
        teamType: team.teamType,
        isOrchestration: true,
      });
    }

    const bridgeKey = teamId;

    if (this.activeBridges.has(bridgeKey)) {
      const existing = this.activeBridges.get(bridgeKey);
      if (existing?.unsub) {
        existing.unsub();
      }
    }

    const session = this.sessionResolver?.getSession?.(username, ownerSessionId);
    if (session) {
      let accumulatedText = "";

      const unsub = (session as any).on
        ? (session as any).on((event: any) => {
            if (event.type === "token") {
              accumulatedText += event.content;

              this.broadcastFn(teamId, {
                type: "team_stream_chunk",
                teamId,
                agentId: leader.agentId,
                agentName: leaderName,
                chunk: event.content,
                fullText: accumulatedText,
                sessionId: ownerSessionId,
                conversationSessionId,
              });
            } else if (event.type === "tool_start") {
              this.broadcastFn(teamId, {
                type: "team_tool_start",
                teamId,
                agentId: leader.agentId,
                agentName: leaderName,
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                args: event.args,
                sessionId: ownerSessionId,
                conversationSessionId,
              });
            } else if (event.type === "tool_end") {
              this.broadcastFn(teamId, {
                type: "team_tool_end",
                teamId,
                agentId: leader.agentId,
                agentName: leaderName,
                toolCallId: event.toolCallId,
                result: event.result,
                error: event.error,
                sessionId: ownerSessionId,
                conversationSessionId,
              });
            } else if (event.type === "done") {
              this.broadcastFn(teamId, {
                type: "team_agent_finished",
                teamId,
                agentId: leader.agentId,
                agentName: leaderName,
                fullText: accumulatedText,
                sessionId: ownerSessionId,
                conversationSessionId,
              });

              this.broadcastFn(teamId, {
                type: "team_dispatch_completed",
                teamId,
                fullText: accumulatedText,
                sessionId: ownerSessionId,
                conversationSessionId,
              });

              const br = this.activeBridges.get(bridgeKey);
              if (br?.unsub) br.unsub();
              this.activeBridges.delete(bridgeKey);
            } else if (event.type === "error") {
              this.broadcastFn(teamId, {
                type: "team_agent_finished",
                teamId,
                agentId: leader.agentId,
                agentName: leaderName,
                error: event.error?.message ?? "Execution error",
                sessionId: ownerSessionId,
                conversationSessionId,
              });

              this.broadcastFn(teamId, {
                type: "team_dispatch_completed",
                teamId,
                error: event.error?.message ?? "Execution error",
                sessionId: ownerSessionId,
                conversationSessionId,
              });

              const br = this.activeBridges.get(bridgeKey);
              if (br?.unsub) br.unsub();
              this.activeBridges.delete(bridgeKey);
            }
          })
        : (session as any).subscribe((event: any) => {
            if (event.type === "token") {
              accumulatedText += event.content;

              this.broadcastFn(teamId, {
                type: "team_stream_chunk",
                teamId,
                agentId: leader.agentId,
                agentName: leaderName,
                chunk: event.content,
                fullText: accumulatedText,
                sessionId: ownerSessionId,
                conversationSessionId,
              });
            }
          });

      this.activeBridges.set(bridgeKey, {
        sessionId: ownerSessionId,
        accumulatedText: "",
        unsub,
      });

      this.broadcastFn(teamId, {
        type: "team_agent_started",
        teamId,
        agentId: leader.agentId,
        agentName: leaderName,
        sessionId: ownerSessionId,
        conversationSessionId,
      });

      session.prompt(userContent).catch((err: any) => {
        console.error("[OrchestrationRunner] prompt error:", err);
      });
    }
  }

  abort(username: string, teamId: string): void {
    const bridge = this.activeBridges.get(teamId);
    if (bridge?.unsub) {
      bridge.unsub();
      bridge.unsub = null;
    }
    this.activeBridges.delete(teamId);

    const ownerSessionId = `${SessionPrefix.TEAM}${teamId}`;
    const session = this.sessionResolver?.getSession?.(username, ownerSessionId);
    if (session) {
      session.abort().catch(() => {});
    }

    this.delegationRegistry.abortAllRecursive(ownerSessionId);
  }
}
