// SPDX-License-Identifier: MIT
import { AgentAvatar } from "@/components/shared/AgentAvatar";
import { AvatarUploadField } from "@/components/shared/AvatarUploadField";
import { Dropdown } from "@/components/ui/Dropdown";
import { FormDialog } from "@/components/ui/FormDialog";
import { useLiterals } from "@/lib";
import { DEFAULT_AVATAR_PREFIX } from "@/lib/defaultAvatars";
import { useState } from "react";
import type { CreateTeam, TeamMember } from "shared";
import { literals as u } from "./TeamCreateModal.literals";

interface TeamCreateModalProps {
  onClose: () => void;
  onCreate: (data: CreateTeam) => Promise<any>;
  onUploadAvatar?: (id: string, file: File) => Promise<string>;
  registeredAgents: any[];
}

export function TeamCreateModal({
  onClose,
  onCreate,
  onUploadAvatar,
  registeredAgents,
}: TeamCreateModalProps) {
  const l = useLiterals(u);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const teamType = "Orchestration";
  const [leaderAgentId, setLeaderAgentId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<string | null>(null);

  const leaderOptions = registeredAgents.map((a: any) => ({
    value: a.id,
    label: `${a.name} (${a.id})`,
  }));

  const nonLeaderAgents = registeredAgents.filter((a: any) => a.id !== leaderAgentId);

  const handleAvatarChange = (file: File | null, preview: string | null) => {
    setAvatarFile(file);
    setSelectedDefaultAvatar(null);
    setAvatarPreview(preview);
  };

  const handleSelectDefaultAvatar = (avatarId: string) => {
    setSelectedDefaultAvatar(avatarId);
    setAvatarFile(null);
    setAvatarPreview(DEFAULT_AVATAR_PREFIX + avatarId);
  };

  const handleClearAvatar = () => {
    setSelectedDefaultAvatar(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const toggleMember = (agentId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId],
    );
  };

  const handleLeaderChange = (id: string) => {
    setLeaderAgentId(id);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (!leaderAgentId) {
      setError(l.selectLeaderPlaceholder);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const members: TeamMember[] = [
        { agentId: leaderAgentId, role: "lead" },
        ...selectedMemberIds.map((id) => ({ agentId: id, role: "member" as const })),
      ];

      const resolvedAvatarUrl = selectedDefaultAvatar
        ? DEFAULT_AVATAR_PREFIX + selectedDefaultAvatar
        : avatarPreview && !avatarPreview.startsWith("blob:")
          ? avatarPreview
          : undefined;

      const team = await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        avatarUrl: resolvedAvatarUrl,
        teamType,
        members,
      });

      if (avatarFile && team.id && onUploadAvatar) {
        await onUploadAvatar(team.id, avatarFile);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || l.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={l.createTitle}
      description={l.createSubtitle}
      onSubmit={handleSubmit}
      submitLabel={submitting ? l.creating : l.createTeam}
      cancelLabel={l.cancel}
      isSubmitting={submitting}
      size="md"
    >
      <div className="space-y-4">
        <AvatarUploadField
          preview={avatarPreview}
          selectedDefault={selectedDefaultAvatar}
          onFileChange={handleAvatarChange}
          onSelectDefault={handleSelectDefaultAvatar}
          onClear={handleClearAvatar}
          entityName={name}
          avatarType="entity"
          entityAvatarEntityType="team"
        />

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {l.teamNameLabel}
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={l.teamNamePlaceholder}
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {l.descriptionLabel}
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={l.descriptionPlaceholder}
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {l.leaderLabel}
          </label>
          {registeredAgents.length === 0 ? (
            <p className="text-xs text-destructive">{l.noAgentsError}</p>
          ) : (
            <Dropdown<string>
              value={leaderAgentId}
              onChange={handleLeaderChange}
              options={leaderOptions}
              placeholder={l.selectLeaderPlaceholder}
              matchWidth
            />
          )}
        </div>

        {leaderAgentId && nonLeaderAgents.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {l.membersLabel}
            </label>
            <div className="space-y-1 max-h-[140px] overflow-y-auto border border-input rounded-lg p-1.5 bg-background/50">
              {nonLeaderAgents.map((agent: any) => {
                const isSelected = selectedMemberIds.includes(agent.id);
                return (
                  <label
                    key={agent.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-card-hover"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleMember(agent.id)}
                      className="rounded border-input text-primary focus:ring-primary accent-primary"
                    />
                    <AgentAvatar name={agent.name} avatarUrl={agent.avatarUrl} size="xs" />
                    <span className="font-medium">{agent.name}</span>
                    <span className="text-muted-foreground ml-auto">{agent.id}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-error/30 text-destructive text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </FormDialog>
  );
}
