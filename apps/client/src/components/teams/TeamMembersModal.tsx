import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Dropdown } from "@/components/ui/Dropdown";
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import type { TeamMember, AgentInfo, TeamRole } from "shared";
import { useLiterals } from "@/lib";
import { literals as u } from "./TeamMembersModal.literals";

const TEAM_ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "member", label: "Member" },
  { value: "observer", label: "Observer" },
];

const OUTPUT_MODE_OPTIONS: { value: "normal" | "full-proposal" | "diff-suggestion"; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "full-proposal", label: "Full Proposal" },
  { value: "diff-suggestion", label: "Diff Suggestion" },
];

interface Props {
  teamName: string;
  members: TeamMember[];
  registeredAgents: AgentInfo[];
  onClose: () => void;
  onAddMember: (data: TeamMember) => Promise<void>;
  onUpdateMember: (agentId: string, data: Partial<TeamMember>) => Promise<void>;
  onRemoveMember: (agentId: string) => Promise<void>;
}

export function TeamMembersModal({
  teamName,
  members,
  registeredAgents,
  onClose,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
}: Props) {
  const l = useLiterals(u);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const getAgentInfo = (agentId: string) => {
    return registeredAgents.find((a) => a.id === agentId);
  };

  const getRoleOptions = (currentMemberId: string, currentRole: TeamRole) => {
    const otherHasLeader = members.some((m) => m.role === "lead" && m.agentId !== currentMemberId);
    return TEAM_ROLE_OPTIONS.map((o) => {
      let disabled = false;
      if (o.value === "lead") {
        disabled = otherHasLeader;
      } else {
        disabled = currentRole === "lead" && !otherHasLeader;
      }
      return { ...o, disabled };
    });
  };

  const handleRoleChange = async (agentId: string, role: TeamRole) => {
    setUpdatingId(agentId);
    try {
      await onUpdateMember(agentId, { role });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOutputModeChange = async (agentId: string, outputMode: "full-proposal" | "diff-suggestion" | "normal") => {
    setUpdatingId(agentId);
    try {
      await onUpdateMember(agentId, { outputMode });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (agentId: string) => {
    setUpdatingId(agentId);
    try {
      await onRemoveMember(agentId);
    } finally {
      setUpdatingId(null);
    }
  };

  const candidates = registeredAgents.filter((a) => !members.some((m) => m.agentId === a.id));
  const hasLeader = members.some((m) => m.role === "lead");

  return (
    <Modal open onClose={onClose} title={`Miembros de #${teamName}`}>
      <div className="p-5 space-y-4">
        {/* Members Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-input text-muted-foreground font-medium uppercase tracking-wider">
                <th className="py-2.5 pr-2">Agent</th>
                <th className="py-2.5 px-2">Role</th>
                <th className="py-2.5 px-2">Output Mode</th>
                <th className="py-2.5 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-input/50">
              {members.map((m) => {
                const info = getAgentInfo(m.agentId);
                const isUpdating = updatingId === m.agentId;
                return (
                  <tr key={m.agentId} className={isUpdating ? "opacity-60 pointer-events-none" : ""}>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2">
                        <AgentAvatar name={info?.name || m.agentId} avatarUrl={info?.avatarUrl} size="xs" />
                        <div>
                          <p className="font-semibold text-foreground">{info?.name || m.agentId}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">{m.agentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Dropdown<TeamRole>
                        value={m.role || "member"}
                        onChange={(val) => handleRoleChange(m.agentId, val)}
                        options={getRoleOptions(m.agentId, m.role || "member")}
                        size="xs"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Dropdown<"full-proposal" | "diff-suggestion" | "normal">
                        value={m.outputMode || "normal"}
                        onChange={(val) => handleOutputModeChange(m.agentId, val)}
                        options={OUTPUT_MODE_OPTIONS}
                        size="xs"
                      />
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        onClick={() => handleRemove(m.agentId)}
                        disabled={m.role === "lead"}
                        className="px-2 py-1 bg-destructive/10 border border-error/25 hover:bg-destructive/20 text-destructive text-[11px] font-medium rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {l.remove}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Inline Add Member */}
        <div className="border-t border-input pt-4">
          <TeamMembersAdd
            candidates={candidates}
            hasLeader={hasLeader}
            adding={adding}
            onAdd={async (data) => {
              setAdding(true);
              try {
                await onAddMember(data);
              } finally {
                setAdding(false);
              }
            }}
            l={l}
          />
        </div>
      </div>
    </Modal>
  );
}

interface AddProps {
  candidates: AgentInfo[];
  hasLeader: boolean;
  adding: boolean;
  onAdd: (data: TeamMember) => Promise<void>;
  l: Record<string, string>;
}

function TeamMembersAdd({ candidates, hasLeader, adding, onAdd, l }: AddProps) {
  const [selectedAgentId, setSelectedAgentId] = useState(candidates[0]?.id || "");
  const [role, setRole] = useState<TeamRole>("member");
  const [outputMode, setOutputMode] = useState<"full-proposal" | "diff-suggestion" | "normal">("normal");
  const [error, setError] = useState<string | null>(null);

  const roleOptions = TEAM_ROLE_OPTIONS.map((o) => ({
    ...o,
    disabled: o.value === "lead" ? hasLeader : false,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    setError(null);
    try {
      await onAdd({ agentId: selectedAgentId, role, outputMode });
      setSelectedAgentId(candidates.find((a) => a.id !== selectedAgentId)?.id || "");
      setRole("member");
      setOutputMode("normal");
    } catch (err: any) {
      setError(err.message || l.addError);
    }
  };

  if (candidates.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">{l.noAgents}</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
        {l.addAgent}
      </label>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]">
          <Dropdown
            value={selectedAgentId}
            onChange={setSelectedAgentId}
            options={candidates.map((a) => ({
              value: a.id,
              label: a.name + (a.role ? ` (${a.role})` : ""),
            }))}
            placeholder="Select agent"
            matchWidth
          />
        </div>

        <div className="w-[120px]">
          <Dropdown<TeamRole>
            value={role}
            onChange={setRole}
            options={roleOptions}
            matchWidth
          />
        </div>

        <div className="w-[140px]">
          <Dropdown<"full-proposal" | "diff-suggestion" | "normal">
            value={outputMode}
            onChange={setOutputMode}
            options={OUTPUT_MODE_OPTIONS}
            matchWidth
          />
        </div>

        <button
          type="submit"
          disabled={adding || !selectedAgentId}
          className="px-4 py-1.5 text-xs font-medium bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {adding ? l.adding : l.addToTeam}
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-error/30 text-destructive text-xs px-3 py-2 rounded-lg">
          {error}
        </div>
      )}
    </form>
  );
}

export function AddTeamMemberModal({ availableAgents, currentMemberAgentIds, onClose, onAdd, hasLeader, literals }: {
  availableAgents: AgentInfo[];
  currentMemberAgentIds: string[];
  onClose: () => void;
  onAdd: (data: TeamMember) => Promise<void>;
  hasLeader: boolean;
  literals: Record<string, string>;
}) {
  const candidates = availableAgents.filter((a) => !currentMemberAgentIds.includes(a.id));
  const [selectedAgentId, setSelectedAgentId] = useState(candidates[0]?.id || "");
  const [role, setRole] = useState<TeamRole>("member");
  const [outputMode, setOutputMode] = useState<"full-proposal" | "diff-suggestion" | "normal">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    setError(null);
    setSubmitting(true);
    try {
      await onAdd({ agentId: selectedAgentId, role, outputMode });
      onClose();
    } catch (err: any) {
      setError(err.message || literals.addError);
    } finally {
      setSubmitting(false);
    }
  };

  const roleOptions = TEAM_ROLE_OPTIONS.map((o) => ({
    ...o,
    disabled: o.value === "lead" ? hasLeader : false,
  }));

  return (
    <Modal open onClose={onClose} title={literals.addAgent}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{literals.noAgents}</p>
        ) : (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Select Agent</label>
              <div className="space-y-1 max-h-40 overflow-y-auto bg-background p-2 rounded-lg border border-input">
                {candidates.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAgentId(a.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                      selectedAgentId === a.id
                        ? "bg-primary/15 border border-primary/30 text-foreground"
                        : "border border-transparent text-muted-foreground hover:bg-card-hover hover:text-foreground"
                    }`}
                  >
                    <AgentAvatar name={a.name} avatarUrl={a.avatarUrl} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-semibold text-foreground truncate">{a.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate font-mono">@{a.id}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{a.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">{literals.role}</label>
              <Dropdown<TeamRole>
                value={role}
                onChange={setRole}
                options={roleOptions}
                matchWidth
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">{literals.outputMode}</label>
              <Dropdown<"full-proposal" | "diff-suggestion" | "normal">
                value={outputMode}
                onChange={setOutputMode}
                options={OUTPUT_MODE_OPTIONS}
                matchWidth
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-error/30 text-destructive text-xs px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-sm font-medium text-muted-foreground border border-input rounded-lg hover:bg-card-hover transition-colors cursor-pointer"
              >
                {literals.cancel}
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedAgentId}
                className="flex-1 py-2 text-sm font-medium bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? literals.adding : literals.addToTeam}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
