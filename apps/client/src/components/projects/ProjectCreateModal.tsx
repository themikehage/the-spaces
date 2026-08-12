// SPDX-License-Identifier: MIT
import { AvatarUploadField } from "@/components/shared/AvatarUploadField";
import { FormDialog } from "@/components/ui/FormDialog";
import { useLiterals } from "@/lib";
import { DEFAULT_AVATAR_PREFIX } from "@/lib/defaultAvatars";
import { useState } from "react";
import { literals as u } from "./ProjectCreateModal.literals";

interface ProjectCreateModalProps {
  onClose: () => void;
  onSubmit: (data: { name: string; cloneUrl?: string; avatarUrl?: string; tag?: string }) => Promise<any>;
  onUploadAvatar?: (id: string, file: File) => Promise<string>;
}

export function ProjectCreateModal({ onClose, onSubmit, onUploadAvatar }: ProjectCreateModalProps) {
  const l = useLiterals(u);
  const [name, setName] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [tag, setTag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<string | null>(null);

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
    setSubmitting(true);

    try {
      const resolvedAvatarUrl = selectedDefaultAvatar
        ? DEFAULT_AVATAR_PREFIX + selectedDefaultAvatar
        : avatarPreview && !avatarPreview.startsWith("blob:")
          ? avatarPreview
          : undefined;

      const project = await onSubmit({
        name: name.trim(),
        cloneUrl: cloneUrl.trim() || undefined,
        avatarUrl: resolvedAvatarUrl,
        tag: tag.trim() || undefined,
      });

      const projectId = project?.id;
      if (avatarFile && projectId && onUploadAvatar) {
        await onUploadAvatar(projectId, avatarFile);
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
      title={l.title}
      description={l.subtitle}
      onSubmit={handleSubmit}
      submitLabel={submitting ? l.creating : l.create}
      cancelLabel={l.cancel}
      isSubmitting={submitting}
      size="sm"
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
          entityAvatarEntityType="project"
        />

        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {l.projectNameLabel}
          </label>
          <input
            type="text"
            required
            placeholder={l.projectNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-input rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {l.cloneUrlLabel}
          </label>
          <input
            type="text"
            placeholder={l.cloneUrlPlaceholder}
            value={cloneUrl}
            onChange={(e) => setCloneUrl(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-input rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Tag
          </label>
          <input
            type="text"
            placeholder="e.g. backend, frontend, core"
            maxLength={64}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-input rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
          />
        </div>

        {error && (
          <div className="bg-destructive/10 border border-error/30 text-destructive text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </FormDialog>
  );
}
