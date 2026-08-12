// SPDX-License-Identifier: MIT
import { SystemPromptViewer } from "@/components/prompts/SystemPromptViewer";
import { AvatarUploadField } from "@/components/shared/AvatarUploadField";
import { Button } from "@/components/ui/Button";
import { FormDialog } from "@/components/ui/FormDialog";
import { TabsNav } from "@/components/ui/TabsNav";
import { useLiterals } from "@/lib";
import { DEFAULT_AVATAR_PREFIX, isDefaultAvatar } from "@/lib/defaultAvatars";
import { useEffect, useState } from "react";
import type { Team } from "shared";
import { literals as u } from "./TeamSettingsModal.literals";

interface Props {
  team: Team;
  onClose: () => void;
  onSave: (updates: {
    name?: string;
    description?: string;
    avatarUrl?: string;
    tag?: string;
    maxRounds?: number;
    showThinking?: boolean;
    showTools?: boolean;
    streamingEnabled?: boolean;
    negotiationProtocol?: any;
  }) => Promise<void>;
  onUploadAvatar?: (id: string, file: File) => Promise<string>;
  onDeleteAvatar?: (id: string) => Promise<void>;
  onDeleteTeam?: (id: string) => Promise<void>;
}

export function TeamSettingsModal({
  team,
  onClose,
  onSave,
  onUploadAvatar,
  onDeleteAvatar,
  onDeleteTeam,
}: Props) {
  const l = useLiterals(u);
  const [activeTab, setActiveTab] = useState<"general" | "prompts">("general");
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");
  const [tag, setTag] = useState(team.tag || "");
  const [showThinking, setShowThinking] = useState(team.showThinking ?? false);
  const [showTools, setShowTools] = useState(team.showTools ?? false);
  const [streamingEnabled, setStreamingEnabled] = useState(team.streamingEnabled ?? true);
  const teamType = team.teamType || "Orchestration";

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Danger zone state
  const [confirmDeleteName, setConfirmDeleteName] = useState("");

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(team.avatarUrl || null);
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<string | null>(() => {
    if (team.avatarUrl && isDefaultAvatar(team.avatarUrl)) {
      return team.avatarUrl.slice(DEFAULT_AVATAR_PREFIX.length);
    }
    return null;
  });

  useEffect(() => {
    setName(team.name);
    setDescription(team.description || "");
    setTag(team.tag || "");
    setShowThinking(team.showThinking ?? false);
    setShowTools(team.showTools ?? false);
    setStreamingEnabled(team.streamingEnabled ?? true);

    setAvatarPreview(team.avatarUrl || null);
    if (team.avatarUrl && isDefaultAvatar(team.avatarUrl)) {
      setSelectedDefaultAvatar(team.avatarUrl.slice(DEFAULT_AVATAR_PREFIX.length));
    } else {
      setSelectedDefaultAvatar(null);
    }
  }, [team]);

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

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setError(null);
    setSaving(true);

    try {
      let resolvedAvatarUrl: string | undefined = team.avatarUrl;

      if (selectedDefaultAvatar) {
        resolvedAvatarUrl = DEFAULT_AVATAR_PREFIX + selectedDefaultAvatar;
      } else if (avatarPreview && !avatarPreview.startsWith("blob:")) {
        resolvedAvatarUrl = avatarPreview;
      } else if (avatarFile === null && avatarPreview === null && onDeleteAvatar) {
        await onDeleteAvatar(team.id);
        resolvedAvatarUrl = undefined;
      }

      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        tag: tag.trim() || undefined,
        showThinking,
        showTools,
        streamingEnabled,
        avatarUrl: resolvedAvatarUrl,
      });

      if (avatarFile && onUploadAvatar) {
        await onUploadAvatar(team.id, avatarFile);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || l.updateError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmDeleteName !== team.name || !onDeleteTeam) return;

    setDeleting(true);
    try {
      await onDeleteTeam(team.id);
      onClose();
    } catch (err: any) {
      setError(err.message || l.updateError);
      setDeleting(false);
    }
  };

  const tabs = [
    { id: "general", label: "General" },
    { id: "prompts", label: "Inspect Prompt" },
  ];

  return (
    <FormDialog
      open
      onClose={onClose}
      title={l.title}
      description={l.teamTypeImmutable}
      onSubmit={handleSubmit}
      submitLabel={saving ? l.saving : l.save}
      cancelLabel={l.cancel}
      isSubmitting={saving}
      size="xl"
    >
      <div className="mb-4">
        <TabsNav
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as "general" | "prompts")}
        />
      </div>

      {activeTab === "general" ? (
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
            <label className="text-xs font-medium text-muted-foreground block mb-1">{l.name}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {l.description}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Tag
            </label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. backend, frontend, core"
              maxLength={64}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {l.teamType}
            </label>
            <input
              type="text"
              disabled
              value={teamType}
              className="w-full bg-background/50 border border-input rounded-lg px-3 py-2 text-sm text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-input space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Chat Options
            </h4>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showThinking}
                onChange={(e) => setShowThinking(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary accent-primary"
              />
              <span className="text-xs text-foreground font-medium">{l.showThinking}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTools}
                onChange={(e) => setShowTools(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary accent-primary"
              />
              <span className="text-xs text-foreground font-medium">{l.showTools}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={streamingEnabled}
                onChange={(e) => setStreamingEnabled(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary accent-primary"
              />
              <span className="text-xs text-foreground font-medium">{l.streamingEnabled}</span>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 text-error rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {onDeleteTeam && (
            <div className="pt-4 mt-4 border-t border-error/20 space-y-3">
              <h4 className="text-xs font-bold text-error uppercase tracking-wider">
                {l.deleteTeam}
              </h4>
              <p className="text-[11px] text-text-secondary leading-relaxed font-body">
                {l.deleteTeamDescription}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    {l.deleteConfirmLabel.replace("{name}", team.name)}
                  </label>
                  <input
                    type="text"
                    value={confirmDeleteName}
                    onChange={(e) => setConfirmDeleteName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-bg border border-error/30 rounded-xl text-sm text-foreground focus:outline-none focus:border-error"
                  />
                </div>
                <Button
                  variant="destructive"
                  type="button"
                  onClick={handleDelete}
                  className="w-full"
                  disabled={confirmDeleteName !== team.name || deleting}
                >
                  {deleting ? l.deleting : l.deleteButton}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <SystemPromptViewer
          entityType="team"
          teamId={team.id}
          title={`Team System Prompt Inspector (${name})`}
          embedded
        />
      )}
    </FormDialog>
  );
}
