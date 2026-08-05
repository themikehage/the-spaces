import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { agentsService } from "@/lib/api/agents.service";
import { projectsService } from "@/lib/api/projects.service";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export interface ProjectAssignmentMember {
  id: string;
  name: string;
  role: string;
}

export interface ProjectAssignment {
  leaderId?: string | null;
  members: ProjectAssignmentMember[];
  updatedAt?: string;
}

interface AgentInfo {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
}

interface Props {
  projectId: string;
}

export function ProjectAssignmentPanel({ projectId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [availableAgents, setAvailableAgents] = useState<AgentInfo[]>([]);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectAssignmentMember[]>([]);

  const [selectedAgentForMember, setSelectedAgentForMember] = useState<string>("");
  const [memberRole, setMemberRole] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [agentsRes, assignRes] = await Promise.all([
          agentsService.fetchAgents().catch(() => []),
          projectsService.fetchProjectAssignment(projectId).catch(() => ({ assignment: null })),
        ]);

        if (!active) return;

        const agentsList = (agentsRes as any).agents || agentsRes || [];
        setAvailableAgents(agentsList);

        const assignmentData = (assignRes as any).assignment || assignRes;
        if (assignmentData) {
          setLeaderId(assignmentData.leaderId || null);
          setMembers(assignmentData.members || []);
        } else {
          setLeaderId(null);
          setMembers([]);
        }
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load project assignment");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [projectId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const data = await projectsService.updateProjectAssignment(projectId, {
        leaderId,
        members,
      });

      const updatedAssign = data.assignment || data;
      if (updatedAssign) {
        setLeaderId(updatedAssign.leaderId || null);
        setMembers(updatedAssign.members || []);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = () => {
    if (!selectedAgentForMember) return;
    const agent = availableAgents.find((a) => a.id === selectedAgentForMember);
    if (!agent) return;

    if (members.some((m) => m.id === agent.id)) {
      setError(`Agent "${agent.name}" is already in the team.`);
      return;
    }

    const newMember: ProjectAssignmentMember = {
      id: agent.id,
      name: agent.name,
      role: memberRole.trim() || agent.role || "Member",
    };

    setMembers([...members, newMember]);
    setSelectedAgentForMember("");
    setMemberRole("");
    setError(null);
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleUpdateMemberRole = (id: string, newRole: string) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, role: newRole } : m)));
  };

  const leaderOptions = useMemo(
    () => [
      { value: "", label: "-- No Leader Assigned --" },
      ...availableAgents.map((a) => ({
        value: a.id,
        label: a.name + (a.role ? ` (${a.role})` : ""),
      })),
    ],
    [availableAgents],
  );

  const memberOptions = useMemo(
    () => [
      { value: "", label: "-- Add Agent as Member --" },
      ...availableAgents
        .filter((a) => a.id !== leaderId && !members.some((m) => m.id === a.id))
        .map((a) => ({
          value: a.id,
          label: a.name + (a.role ? ` (${a.role})` : ""),
        })),
    ],
    [availableAgents, leaderId, members],
  );

  if (loading) {
    return (
      <div className="p-4 text-xs text-text-secondary animate-pulse">
        Loading project assignment...
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 bg-bg/40 border border-input/40 rounded-xl">
      <div className="flex items-center justify-between border-b border-input/30 pb-3">
        <div>
          <h4 className="text-sm font-bold text-foreground">Project Agent Assignment</h4>
          <p className="text-xs text-text-secondary">
            Assign a lead agent and team members. The leader's prompt will be automatically injected
            into project sessions.
          </p>
        </div>
        {success && (
          <span className="text-xs text-emerald-400 font-medium">Saved successfully!</span>
        )}
      </div>

      {error && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Leader Assignment */}
      <div>
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
          Project Lead Agent
        </label>
        <div className="flex gap-2 items-center">
          <Dropdown
            value={leaderId || ""}
            onChange={(val) => setLeaderId(val || null)}
            options={leaderOptions}
            placeholder="-- No Leader Assigned --"
            matchWidth
            className="flex-1"
          />
          {leaderId && (
            <button
              type="button"
              onClick={() => setLeaderId(null)}
              className="px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Team Members List */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Assigned Team Members ({members.length})
        </label>

        {members.length === 0 ? (
          <p className="text-xs text-text-secondary italic">
            No additional team members assigned yet.
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 p-2.5 bg-bg/80 border border-input/40 rounded-xl text-xs"
              >
                <div className="flex-1 font-medium text-foreground">{member.name}</div>
                <input
                  type="text"
                  value={member.role}
                  onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                  placeholder="Role (e.g. Frontend, QA)"
                  className="w-36 px-2 py-1 bg-card border border-input rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-1 text-text-secondary hover:text-red-400 rounded transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Member Row */}
        <div className="flex gap-2 pt-2 border-t border-input/20">
          <Dropdown
            value={selectedAgentForMember}
            onChange={setSelectedAgentForMember}
            options={memberOptions}
            placeholder="-- Add Agent as Member --"
            matchWidth
            className="flex-1"
          />
          <input
            type="text"
            placeholder="Role"
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value)}
            className="w-32 px-2 py-1.5 bg-bg border border-input rounded-xl text-xs text-foreground focus:outline-none focus:border-accent"
          />
          <Button
            type="button"
            variant="outline"
            disabled={!selectedAgentForMember}
            onClick={handleAddMember}
            className="text-xs px-3 py-1.5"
          >
            Add
          </Button>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-xs px-4 py-1.5"
        >
          {saving ? "Saving..." : "Save Assignment"}
        </Button>
      </div>
    </div>
  );
}
