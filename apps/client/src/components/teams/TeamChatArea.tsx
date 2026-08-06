// SPDX-License-Identifier: MIT
import { ChatArea } from "@/components/chat/ChatArea";
import type { MentionTarget } from "@/components/chat/ChatInput";
import { ChatInput } from "@/components/chat/ChatInput";
import { EntityAvatar } from "@/components/shared/EntityAvatar";
import { useTeam } from "@/hooks/useTeam";
import { agentsService } from "@/lib/api/agents.service";
import { teamsService } from "@/lib/api/teams.service";
import { EntityEventBus } from "@/lib/event-bus";
import { getSessionPath } from "@/lib/session-utils";
import { List, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AgentInfo, TeamContextItem, TeamMember } from "shared";
import { TeamContextModal } from "./TeamContextModal";
import { TeamMembersModal } from "./TeamMembersModal";
import { TeamMessageList } from "./TeamMessageList";

interface Props {
  activeTeam: { id: string; name: string; avatarUrl?: string };
  sessionId: string | null;
  variantMode?: boolean;
}

export function TeamChatArea({ activeTeam, sessionId, variantMode = false }: Props) {
  const { team, messages, streamingAgents, sendMessage, abortDispatch, fetchTeam } = useTeam(
    activeTeam.id,
    sessionId,
  );
  const navigate = useNavigate();

  const isStreaming = Object.keys(streamingAgents).length > 0;
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [registeredAgents, setRegisteredAgents] = useState<AgentInfo[]>([]);

  const handleSaveContext = async (context: TeamContextItem[]) => {
    await teamsService.updateTeamContext(activeTeam.id, context);
    await fetchTeam();
  };

  const mentionTargets: MentionTarget[] = [
    { id: "__user__", name: "user" },
    ...teamMembers.map((m) => ({
      id: m.agentId,
      name: registeredAgents.find((a) => a.id === m.agentId)?.name || m.agentId,
    })),
  ];

  const loadTeamDetails = useCallback(async () => {
    try {
      const [tData, agData] = await Promise.all([
        teamsService.fetchTeam(activeTeam.id),
        agentsService.fetchAgents(),
      ]);
      if (tData) {
        setTeamMembers((tData as any).members || []);
      }
      setRegisteredAgents((agData as any).agents || agData || []);
    } catch {
      /* noop */
    }
  }, [activeTeam.id]);

  useEffect(() => {
    loadTeamDetails();
    return EntityEventBus.subscribe((detail) => {
      if (detail?.type === "team") {
        loadTeamDetails();
        fetchTeam();
      }
    });
  }, [loadTeamDetails, fetchTeam]);

  const handleAddMember = async (data: TeamMember) => {
    await teamsService.addTeamMember(activeTeam.id, data);
    await loadTeamDetails();
    await fetchTeam();
  };

  const handleUpdateMember = async (agentId: string, data: Partial<TeamMember>) => {
    await teamsService.updateTeamMember(activeTeam.id, agentId, data);
    await loadTeamDetails();
    await fetchTeam();
  };

  const handleRemoveMember = async (agentId: string) => {
    await teamsService.removeTeamMember(activeTeam.id, agentId);
    await loadTeamDetails();
    await fetchTeam();
  };

  const handleOpenSubagentConsole = (
    toolCallId: string,
    targetType?: string,
    targetId?: string,
  ) => {
    const prefix =
      targetType === "delegate" ||
      targetType === "channel" ||
      targetType === "agent" ||
      targetType === "project" ||
      targetType === "session"
        ? "del"
        : "sub";
    const subSessionId = `${prefix}_${toolCallId}`;

    let context: any = { activeTeam };

    if (targetType && targetId) {
      if (activeTeam) {
        context = { activeTeam };
      } else {
        context = {
          activeChannel: targetType === "channel" ? { id: targetId, name: "" } : null,
          activeAgent: targetType === "agent" ? { id: targetId, name: "" } : null,
          activeProjectName: targetType === "project" ? targetId : null,
        };
      }
    }

    navigate(getSessionPath(subSessionId, context));
  };

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    sendMessage(text.trim());
  };

  const leadMember = teamMembers.find((m) => m.role === "lead");
  const leadAgent = leadMember ? registeredAgents.find((a) => a.id === leadMember.agentId) : null;

  if (team?.teamType === "Orchestration" || (sessionId && sessionId.startsWith("team_"))) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
        {/* Sub-header */}
        {!variantMode && (
          <div className="h-10 px-4 border-b border-border/60 flex items-center justify-between flex-shrink-0 bg-card/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <EntityAvatar
                  name={team?.name || activeTeam.name}
                  avatarUrl={team?.avatarUrl || activeTeam.avatarUrl}
                  size="xs"
                  type="team"
                  className="mr-1"
                />
                {team?.name || activeTeam.name}
              </span>
              {team?.description && (
                <>
                  <span className="text-surface-hover">|</span>
                  <span className="truncate hidden sm:inline">{team.description}</span>
                </>
              )}
              {leadAgent && (
                <>
                  <span className="text-surface-hover">|</span>
                  <span className="text-primary font-medium truncate">Lead: @{leadAgent.name}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowContextModal(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors relative"
                title={`Contexto (${team?.context?.length ?? 0} variables)`}
              >
                <List size={14} />
                {(team?.context?.length ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-background font-bold text-xs rounded-full flex items-center justify-center">
                    {team?.context?.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowMembersModal(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors relative"
                title={`Miembros (${team?.members?.length ?? 0} agentes)`}
              >
                <Users size={14} />
                {(team?.members?.length ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-card-hover text-foreground border border-input font-bold text-xs rounded-full flex items-center justify-center">
                    {team?.members?.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 min-h-0 relative">
          <ChatArea sessionId={sessionId} activeProjectName={null} activeTeam={activeTeam} />
        </div>

        {showMembersModal && (
          <TeamMembersModal
            teamName={team?.name || activeTeam.name}
            members={teamMembers}
            registeredAgents={registeredAgents}
            onClose={() => setShowMembersModal(false)}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onRemoveMember={handleRemoveMember}
          />
        )}

        {showContextModal && (
          <TeamContextModal
            teamName={team?.name || activeTeam.name}
            context={team?.context || []}
            onClose={() => setShowContextModal(false)}
            onSave={handleSaveContext}
          />
        )}
      </div>
    );
  }

  const agentAvatarMap = registeredAgents.reduce(
    (acc, agent) => {
      if (agent.id && agent.avatarUrl) {
        acc[agent.id] = agent.avatarUrl;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Sub-header */}
      {!variantMode && (
        <div className="h-10 px-4 border-b border-border/60 flex items-center justify-between flex-shrink-0 bg-card/20 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <EntityAvatar
                name={team?.name || activeTeam.name}
                avatarUrl={team?.avatarUrl || activeTeam.avatarUrl}
                size="xs"
                type="team"
                className="mr-1"
              />
              {team?.name || activeTeam.name}
            </span>
            {team?.description && (
              <>
                <span className="text-surface-hover">|</span>
                <span className="truncate hidden sm:inline">{team.description}</span>
              </>
            )}
            {leadAgent && (
              <>
                <span className="text-surface-hover">|</span>
                <span className="text-primary font-medium truncate">Lead: @{leadAgent.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowContextModal(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors relative"
              title={`Contexto (${team?.context?.length ?? 0} variables)`}
            >
              <List size={14} />
              {(team?.context?.length ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-background font-bold text-xs rounded-full flex items-center justify-center">
                  {team?.context?.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowMembersModal(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors relative"
              title={`Miembros (${team?.members?.length ?? 0} agentes)`}
            >
              <Users size={14} />
              {(team?.members?.length ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-card-hover text-foreground border border-input font-bold text-xs rounded-full flex items-center justify-center">
                  {team?.members?.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <>
        <TeamMessageList
          messages={messages}
          streamingAgents={streamingAgents}
          mentionNames={[
            "user",
            ...teamMembers.map(
              (m) => registeredAgents.find((a) => a.id === m.agentId)?.name || m.agentId,
            ),
          ]}
          sessionId={sessionId}
          activeTeamId={activeTeam.id}
          onOpenSubagentConsole={handleOpenSubagentConsole}
          agentAvatarMap={agentAvatarMap}
        />

        {sessionId && !variantMode && (
          <ChatInput
            sessionId={sessionId}
            streaming={isStreaming}
            onSend={(msg) => handleSend(msg)}
            onAbort={abortDispatch}
            mentionTargets={mentionTargets}
            activeChannelId={activeTeam.id} // We reuse activeChannelId prop so it binds correctly in ChatInput
            userMessages={(messages || [])
              .filter((m: any) => m.role === "user")
              .map((m: any) => {
                if (typeof m.content === "string") return m.content;
                if (Array.isArray(m.content)) {
                  const textPart = m.content.find((c: any) => c.type === "text" && c.text);
                  if (textPart?.text) return textPart.text;
                }
                return "";
              })
              .filter((text: string) => text.trim().length > 0)}
          />
        )}
      </>

      {showMembersModal && (
        <TeamMembersModal
          teamName={team?.name || activeTeam.name}
          members={teamMembers}
          registeredAgents={registeredAgents}
          onClose={() => setShowMembersModal(false)}
          onAddMember={handleAddMember}
          onUpdateMember={handleUpdateMember}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {showContextModal && (
        <TeamContextModal
          teamName={team?.name || activeTeam.name}
          context={team?.context || []}
          onClose={() => setShowContextModal(false)}
          onSave={handleSaveContext}
        />
      )}
    </div>
  );
}
