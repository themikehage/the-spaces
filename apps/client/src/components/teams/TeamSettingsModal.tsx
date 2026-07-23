import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Team } from "shared";
import { useLiterals } from "@/lib";
import { literals as u } from "./TeamSettingsModal.literals";
import { AvatarUploadField } from "@/components/shared/AvatarUploadField";
import { DEFAULT_AVATAR_PREFIX, isDefaultAvatar } from "@/lib/defaultAvatars";
import { Button } from "@/components/ui/Button";

interface Props {
  team: Team;
  onClose: () => void;
  onSave: (updates: {
    name?: string;
    description?: string;
    avatarUrl?: string;
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
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const resolvedAvatarUrl = selectedDefaultAvatar
        ? DEFAULT_AVATAR_PREFIX + selectedDefaultAvatar
        : avatarPreview && !avatarPreview.startsWith("blob:") && !isDefaultAvatar(avatarPreview)
          ? avatarPreview
          : "";

      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        avatarUrl: resolvedAvatarUrl,
        maxRounds: team.maxRounds,
        showThinking,
        showTools,
        streamingEnabled,
      });

      if (avatarFile && onUploadAvatar) {
        await onUploadAvatar(team.id, avatarFile);
      }

      if (!avatarFile && !selectedDefaultAvatar && avatarPreview === null && onDeleteAvatar) {
        await onDeleteAvatar(team.id);
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
    setError(null);
    setDeleting(true);

    try {
      await onDeleteTeam(team.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete team");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-lg bg-card border border-input rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-input flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm">{l.title}</h3>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-accent/15 text-accent border border-accent/25">
              {teamType}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-card-hover transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-error/20 text-destructive rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-muted-foreground font-medium mb-1">{l.name}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-muted-foreground font-medium mb-1">{l.description}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground outline-none focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-muted-foreground font-medium mb-2">{l.teamType}</label>
              <div className="p-3 rounded-xl border border-input bg-background">
                <span className="font-semibold text-xs text-foreground">{teamType}</span>
                <p className="text-[10px] leading-tight text-muted-foreground mt-1">
                  {l.orchestrationDesc}
                </p>
                <p className="text-[10px] leading-tight text-muted-foreground mt-2">{l.teamTypeImmutable}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2 border-t border-input/40">
              <label className="flex items-center gap-2.5 text-muted-foreground font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showThinking}
                  onChange={(e) => setShowThinking(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded border-input bg-background cursor-pointer"
                />
                <span>{l.showThinking}</span>
              </label>

              <label className="flex items-center gap-2.5 text-muted-foreground font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTools}
                  onChange={(e) => setShowTools(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded border-input bg-background cursor-pointer"
                />
                <span>{l.showTools}</span>
              </label>

              <label className="flex items-center gap-2.5 text-muted-foreground font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={streamingEnabled}
                  onChange={(e) => setStreamingEnabled(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded border-input bg-background cursor-pointer"
                />
                <span>{l.streamingEnabled}</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-input bg-card flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-card border border-input text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              >
                {l.cancel}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-background font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
              >
                {saving ? l.saving : l.save}
              </button>
            </div>
          </form>

          {onDeleteTeam && (
            <div className="pt-4 border-t border-error/20 space-y-3">
              <h4 className="text-xs font-bold text-error uppercase tracking-wider">{l.deleteTeam}</h4>
              <p className="text-[11px] text-text-secondary leading-relaxed font-body">{l.deleteTeamDescription}</p>
              <form onSubmit={handleDelete} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    {l.deleteConfirmLabel.replace("{name}", team.name)}
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmDeleteName}
                    onChange={(e) => setConfirmDeleteName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-bg border border-error/30 rounded-xl text-sm text-foreground focus:outline-none focus:border-error"
                  />
                </div>
                <Button
                  variant="destructive"
                  type="submit"
                  className="w-full"
                  disabled={confirmDeleteName !== team.name || deleting}
                >
                  {deleting ? l.deleting : l.deleteButton}
                </Button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
