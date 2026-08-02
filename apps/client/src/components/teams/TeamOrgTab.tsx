// SPDX-License-Identifier: MIT
import { useSessions } from "@/contexts/SessionsContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { StreamingAgentState } from "@/hooks/useTeam";
import { useLiterals } from "@/lib";
import type { AgentInfo, TeamMember } from "@spaces/core";
import { Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AgentDetailPanel } from "./AgentDetailPanel";
import { OrgFlowCanvas } from "./OrgFlowCanvas";
import { OrgFlowMobile } from "./OrgFlowMobile";
import { literals as u } from "./TeamOrgTab.literals";

interface Props {
  members: TeamMember[];
  registeredAgents: AgentInfo[];
  streamingAgents: Record<string, StreamingAgentState>;
  onAddMemberClick: () => void;
  onUpdateMember: (agentId: string, updates: Partial<TeamMember>) => Promise<void>;
  onRemoveMember: (agentId: string) => Promise<void>;
}

export function TeamOrgTab({
  members,
  registeredAgents,
  streamingAgents,
  onAddMemberClick,
  onUpdateMember,
  onRemoveMember,
}: Props) {
  const l = useLiterals(u);
  const { isMobile } = useIsMobile();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { getChannelMemberKanbanStatus } = useSessions();

  const memberSessionStatuses = useMemo(() => {
    const map: Record<string, "idle" | "working" | "unknown"> = {};
    for (const m of members) {
      const status = getChannelMemberKanbanStatus(m.agentId);
      map[m.agentId] = status === "working" ? "working" : "idle";
    }
    return map;
  }, [members, getChannelMemberKanbanStatus]);

  const selectedTeamMember = selectedMemberId
    ? members.find((m) => m.agentId === selectedMemberId)
    : null;

  const selectedAgentInfo = selectedTeamMember
    ? registeredAgents.find((a) => a.id === selectedTeamMember.agentId)
    : undefined;

  const selectedStreamingState = selectedTeamMember
    ? streamingAgents[selectedTeamMember.agentId]
    : undefined;

  const handleEditAgent = (member: TeamMember) => {
    setSelectedMemberId(member.agentId);
  };

  const handleUpdateTeamMember = async (agentId: string, updates: any) => {
    // updates from AgentDetailPanel matches TeamMember properties.
    // We map them back to TeamMember partial updates.
    // role is shared. outputMode / outputMode are mapped correctly.
    const teamUpdates: Partial<TeamMember> = {};
    if (updates.role) {
      teamUpdates.role = updates.role;
    }
    if (updates.outputMode) {
      teamUpdates.outputMode = updates.outputMode;
    }
    await onUpdateMember(agentId, teamUpdates);
  };

  if (members.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground text-xs gap-3">
        <Users size={32} className="opacity-40" />
        <p>{l.noAgents}</p>
        <button
          onClick={onAddMemberClick}
          className="px-3.5 py-1.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition-colors font-semibold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
        >
          <Plus size={12} />
          <span>{l.addAgent}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden relative">
      {/* Sub-toolbar */}
      <div className="h-10 px-4 border-b border-border/40 flex items-center justify-between flex-shrink-0 bg-card/10 text-xs">
        <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
          Hierarchy & Roles
        </span>
        <button
          onClick={onAddMemberClick}
          className="px-2.5 py-1 bg-accent/90 hover:bg-accent text-background font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
        >
          <Plus size={12} />
          <span>{l.addAgent}</span>
        </button>
      </div>

      {/* Main Area (responsive dispatch) */}
      <div className="flex-1 flex min-h-0 relative">
        {isMobile ? (
          <OrgFlowMobile
            members={members}
            registeredAgents={registeredAgents}
            streamingAgents={streamingAgents as any}
            sessionStatuses={memberSessionStatuses}
            onEditAgent={handleEditAgent}
          />
        ) : (
          <OrgFlowCanvas
            members={members}
            registeredAgents={registeredAgents}
            streamingAgents={streamingAgents as any}
            sessionStatuses={memberSessionStatuses}
            onEditAgent={handleEditAgent}
          />
        )}
      </div>

      {/* Detail Slide-over / Sheet */}
      {selectedTeamMember && (
        <AgentDetailPanel
          isOpen={true}
          onClose={() => setSelectedMemberId(null)}
          member={selectedTeamMember}
          agentInfo={selectedAgentInfo}
          allMembers={members}
          streamingState={selectedStreamingState as any}
          onUpdateMember={handleUpdateTeamMember}
          onRemoveMember={onRemoveMember}
          mode={isMobile ? "bottom-sheet" : "slide-over"}
        />
      )}
    </div>
  );
}
