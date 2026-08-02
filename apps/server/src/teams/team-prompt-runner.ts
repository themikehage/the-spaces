// SPDX-License-Identifier: MIT
import type { IModelProvider } from "@spaces/core";
import { type Team, type TeamMember, type TeamMessage } from "@spaces/core";
import { OpenAICompatibleProvider } from "@spaces/providers";
import { resolveModelWithFallback } from "../core/agent-utils";

import { buildAgentPrompt } from "../core/multi-agent/agent-prompt-runner";
import { parseMentions } from "../core/multi-agent/mention-parser";
import { enforceDiffFormat, parseAgentResponse } from "../core/multi-agent/response-parser";
import { assemblePromptAppends } from "../core/prompts/prompt-assembly";

export interface ActiveTeamStream {
  agentId: string;
  agentName: string;
  text: string;
  thinking: string;
  toolCalls: Record<
    string,
    {
      toolName: string;
      args: any;
      result: any | null;
      isError: boolean;
    }
  >;
}

export function isSubstantiveMessage(content: string): boolean {
  if (content.trim().length <= 10) return false;
  const trivial = /^(hola|para|ok|si|no|gracias|dale|listo|stop|hey|hi|hello|\.\.\.)$/i;
  return !trivial.test(content.trim());
}

function getOutputMode(
  member: TeamMember,
  team?: Team,
): "full-proposal" | "diff-suggestion" | "normal" {
  if (member.outputMode) return member.outputMode;
  if (member.role === "lead") return "full-proposal";
  return "normal";
}

function buildTeamDeploymentContext(
  team: Team,
  agentId: string,
  agentNameMap: Map<string, string>,
) {
  const selfMember = team.members.find((m) => m.agentId === agentId);

  const leaderMember = team.members.find((m) => m.role === "lead");
  const leaderName = leaderMember
    ? agentNameMap.get(leaderMember.agentId) || leaderMember.agentId
    : undefined;
  const selfOutputMode = selfMember ? getOutputMode(selfMember, team) : "normal";

  return {
    mode: "debate" as const,
    channelId: team.id,
    agentRole: selfMember?.role || "member",
    members: team.members.map((m) => ({
      agentId: m.agentId,
      agentName: agentNameMap.get(m.agentId) || m.agentId,
      role: m.role || "member",
      replyMode: "broadcast",
      outputMode: getOutputMode(m, team),
    })),
    selfReplyMode: "broadcast",
    leaderName,
    outputMode: selfOutputMode,
  };
}

export class TeamPromptRunner {
  constructor(
    private activeStreams: Map<string, Map<string, ActiveTeamStream>>,
    private broadcastFn: (teamId: string, data: any) => void,
  ) {}

  async runStateless(
    username: string,
    teamId: string,
    member: TeamMember,
    incomingMsg: TeamMessage,
    recentHistory: TeamMessage[],
    agentNameMap: Map<string, string>,
    signal: AbortSignal,
  ): Promise<{ agentMsg: TeamMessage | null }> {
    if (signal.aborted) return { agentMsg: null };

    const { TeamStore } = await import("./team-store");
    const { AgentRegistry } = await import("../agents");
    const { UserConfigManager } = await import("../core/session/user-config");
    const teamStore = new TeamStore();
    const agentRegistry = new AgentRegistry();
    const userConfigManager = new UserConfigManager();

    const team = teamStore.getTeam(username, teamId);
    if (!team) return { agentMsg: null };

    // Pre-LLM silent bypass
    if (team.members.length > 1) {
      const isObserver = member.role === "observer";
      if (isObserver) {
        return { agentMsg: null };
      }
    }

    const agentEntry = agentRegistry.get(member.agentId);
    if (!agentEntry || agentEntry.status === "stopped") {
      this.broadcastFn(teamId, {
        type: "team_agent_error",
        teamId,
        agentId: member.agentId,
        error: `Agent "${member.agentId}" is not available`,
      });
      return { agentMsg: null };
    }

    const agentName = agentEntry.server.definition.name;

    // Resolve model settings (reusing logic from channel runner)
    let model = agentEntry.server.session.model;
    if (!model) {
      const { modelRegistry } = userConfigManager.getUserContext(username);
      modelRegistry.refresh();
      const resolved = resolveModelWithFallback(undefined, modelRegistry);
      if (resolved) {
        model =
          modelRegistry
            .getAvailable()
            .find((m: any) => m.id === resolved || `${m.provider}/${m.id}` === resolved) || null;
        if (model) {
          try {
            await agentEntry.server.session.setModel(model);
          } catch (e) {
            console.error(`[TeamPromptRunner] Failed to assign model to ${member.agentId}:`, e);
          }
        }
      }
    }

    if (!model) {
      this.broadcastFn(teamId, {
        type: "team_agent_error",
        teamId,
        agentId: member.agentId,
        error: `No LLM providers or models available for agent "${agentName}". Please configure API keys in Settings.`,
      });
      return { agentMsg: null };
    }

    const streamKey = `${teamId}:${incomingMsg.sessionId || "default"}`;
    let teamStreams = this.activeStreams.get(streamKey);
    if (!teamStreams) {
      teamStreams = new Map();
      this.activeStreams.set(streamKey, teamStreams);
    }
    teamStreams.set(member.agentId, {
      agentId: member.agentId,
      agentName,
      text: "",
      thinking: "",
      toolCalls: {},
    });

    this.broadcastFn(teamId, {
      type: "team_agent_start",
      teamId,
      sessionId: incomingMsg.sessionId,
      agentId: member.agentId,
      agentName,
    });

    // Build Deployment Context
    const deployment = buildTeamDeploymentContext(team, member.agentId, agentNameMap);
    const workspaceDir = agentEntry.server.session.cwd;

    const appendSystemPrompts = assemblePromptAppends({
      mode: "debate-stateless",
      workspaceDir,
      agentDef: {
        name: agentEntry.server.definition.name,
        systemPrompt: agentEntry.server.definition.systemPrompt || "",
      },
      deployment: deployment as any,
    });

    const resourceLoader = agentEntry.server.session.resourceLoader;
    const baseSystemPrompt = resourceLoader.getSystemPrompt() || "";
    const fullSystemPrompt = [baseSystemPrompt, ...(appendSystemPrompts || [])]
      .filter(Boolean)
      .join("\n\n");

    const promptText = buildAgentPrompt(
      incomingMsg as any,
      recentHistory as any,
      ((team as any).context || []) as any,
    );

    const context = {
      systemPrompt: fullSystemPrompt,
      messages: [
        {
          role: "user" as const,
          content: promptText,
          timestamp: Date.now(),
        },
      ],
    };

    let fullResponse = "";
    const streamingEnabled = team.streamingEnabled !== false;

    const provider: IModelProvider = new OpenAICompatibleProvider({
      baseUrl: (model as any).baseUrl || "https://api.openai.com/v1",
      apiKey: model.apiKey,
      model: model.id,
    });

    try {
      await provider.streamComplete({
        messages: [{ role: "user", content: promptText }],
        tools: [],
        system: fullSystemPrompt,
        signal,
        onDelta: (delta) => {
          if (delta.type === "text" && delta.text) {
            fullResponse += delta.text;
            const activeStreamsMap = this.activeStreams.get(streamKey);
            const activeStream = activeStreamsMap?.get(member.agentId);
            if (activeStream) {
              activeStream.text += delta.text;
            }
            if (streamingEnabled) {
              this.broadcastFn(teamId, {
                type: "team_agent_token",
                teamId,
                sessionId: incomingMsg.sessionId,
                agentId: member.agentId,
                token: delta.text,
                fullText: activeStream ? activeStream.text : undefined,
              });
            }
          }
        },
      });

      const parseResult = parseAgentResponse(
        [{ role: "assistant", content: fullResponse }],
        { showThinking: team.showThinking, showTools: true },
        fullResponse,
      );

      parseResult.content = enforceDiffFormat(
        parseResult.content,
        deployment.outputMode || "normal",
      );

      this.broadcastFn(teamId, {
        type: "team_agent_end",
        teamId,
        sessionId: incomingMsg.sessionId,
        agentId: member.agentId,
      });

      if (parseResult.isSilent) {
        console.log(`[TeamPromptRunner] Agent ${member.agentId} produced silent response`);
        return { agentMsg: null };
      }

      const agentMentions = parseMentions(parseResult.content, team.members as any, agentNameMap);

      const agentMsg: TeamMessage = {
        id: crypto.randomUUID(),
        teamId,
        sessionId: incomingMsg.sessionId,
        role: "agent",
        agentId: member.agentId,
        agentName,
        content: parseResult.content,
        thinking: parseResult.thinking || undefined,
        toolCalls: parseResult.toolCalls.length > 0 ? parseResult.toolCalls : undefined,
        mentions: agentMentions.length > 0 ? agentMentions : undefined,
        tokensIn: parseResult.tokensIn || undefined,
        tokensOut: parseResult.tokensOut || undefined,
        createdAt: new Date().toISOString(),
      };

      return { agentMsg };
    } catch (err: any) {
      const isAbort =
        signal.aborted || err.message?.includes("abort") || err.message?.includes("cancel");
      if (!isAbort) {
        console.error(`[TeamPromptRunner] Error prompting stateless agent ${member.agentId}:`, err);
        this.broadcastFn(teamId, {
          type: "team_agent_error",
          teamId,
          sessionId: incomingMsg.sessionId,
          agentId: member.agentId,
          error: String(err.message || err),
        });
      }
      this.broadcastFn(teamId, {
        type: "team_agent_end",
        teamId,
        sessionId: incomingMsg.sessionId,
        agentId: member.agentId,
      });
      return { agentMsg: null };
    } finally {
      const activeStreamsMap = this.activeStreams.get(streamKey);
      if (activeStreamsMap) {
        activeStreamsMap.delete(member.agentId);
        if (activeStreamsMap.size === 0) {
          this.activeStreams.delete(streamKey);
        }
      }
    }
  }
}
