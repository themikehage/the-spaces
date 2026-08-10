// SPDX-License-Identifier: MIT
import { SystemPromptViewer } from "@/components/prompts/SystemPromptViewer";
import { AvatarUploadField } from "@/components/shared/AvatarUploadField";
import { Button } from "@/components/ui/Button";
import { FormDialog } from "@/components/ui/FormDialog";
import { TabsNav } from "@/components/ui/TabsNav";
import { useLiterals } from "@/lib";
import { DEFAULT_AVATAR_PREFIX, isDefaultAvatar } from "@/lib/defaultAvatars";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { ProjectAssignmentPanel } from "./ProjectAssignmentPanel";
import { literals as u } from "./ProjectSettingsModal.literals";

interface Project {
  id: string;
  name: string;
  cloneUrl?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
  diskPath?: string;
}

interface Props {
  project: Project;
  onClose: () => void;
  onSave: (updates: {
    name: string;
    cloneUrl: string | null;
    avatarUrl: string | null;
  }) => Promise<void>;
  onUploadAvatar?: (id: string, file: File) => Promise<string>;
  onDeleteAvatar?: (id: string) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
}

export function ProjectSettingsModal({
  project,
  onClose,
  onSave,
  onUploadAvatar,
  onDeleteAvatar,
  onDeleteProject,
}: Props) {
  const l = useLiterals(u);
  const [activeTab, setActiveTab] = useState<"general" | "prompts">("general");
  const [name, setName] = useState(project.name);
  const [cloneUrl, setCloneUrl] = useState(project.cloneUrl || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Danger zone state
  const [confirmDeleteName, setConfirmDeleteName] = useState("");

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(project.avatarUrl || null);
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<string | null>(() => {
    if (project.avatarUrl && isDefaultAvatar(project.avatarUrl)) {
      return project.avatarUrl.slice(DEFAULT_AVATAR_PREFIX.length);
    }
    return null;
  });

  useEffect(() => {
    setName(project.name);
    setCloneUrl(project.cloneUrl || "");
    setAvatarPreview(project.avatarUrl || null);
    if (project.avatarUrl && isDefaultAvatar(project.avatarUrl)) {
      setSelectedDefaultAvatar(project.avatarUrl.slice(DEFAULT_AVATAR_PREFIX.length));
    } else {
      setSelectedDefaultAvatar(null);
    }
  }, [project]);

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
      let resolvedAvatarUrl: string | null = project.avatarUrl || null;

      if (selectedDefaultAvatar) {
        resolvedAvatarUrl = DEFAULT_AVATAR_PREFIX + selectedDefaultAvatar;
      } else if (avatarPreview && !avatarPreview.startsWith("blob:")) {
        resolvedAvatarUrl = avatarPreview;
      } else if (avatarFile === null && avatarPreview === null && onDeleteAvatar) {
        await onDeleteAvatar(project.id);
        resolvedAvatarUrl = null;
      }

      await onSave({
        name: name.trim(),
        cloneUrl: cloneUrl.trim() || null,
        avatarUrl: resolvedAvatarUrl,
      });

      if (avatarFile && onUploadAvatar) {
        await onUploadAvatar(project.id, avatarFile);
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
    if (confirmDeleteName !== project.name || !onDeleteProject) return;

    setDeleting(true);
    try {
      await onDeleteProject(project.id);
      onClose();
    } catch (err: any) {
      setError(err.message || l.updateError);
      setDeleting(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(project.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const tabs = [
    { id: "general", label: "General" },
    { id: "prompts", label: "Inspect Prompt" },
  ];

  return (
    <FormDialog
      open
      onClose={onClose}
      title={project.name}
      description={l.title}
      onSubmit={handleSubmit}
      submitLabel={saving ? l.saving : l.saveChanges}
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
            entityAvatarEntityType="project"
          />

          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Project ID
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={project.id}
                className="w-full px-3 py-1.5 bg-bg/50 border border-input rounded-xl text-xs text-text-secondary font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyId}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-card-hover rounded-lg transition-colors cursor-pointer flex-shrink-0"
                title="Copy Project ID"
              >
                {copiedId ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
              {l.projectNameLabel}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-input rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
              {l.cloneUrlLabel}
            </label>
            <input
              type="text"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-input rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          {project.diskPath && (
            <div>
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Disk Path
              </label>
              <input
                type="text"
                readOnly
                value={project.diskPath}
                className="w-full px-3 py-1.5 bg-bg/50 border border-input rounded-xl text-[10px] text-text-secondary font-mono focus:outline-none overflow-x-auto"
              />
            </div>
          )}

          <div className="pt-2">
            <ProjectAssignmentPanel projectId={project.id} />
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 text-error rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {onDeleteProject && (
            <div className="pt-4 mt-4 border-t border-error/20 space-y-3">
              <h4 className="text-xs font-bold text-error uppercase tracking-wider">
                {l.deleteProject}
              </h4>
              <p className="text-[11px] text-text-secondary leading-relaxed font-body">
                {l.deleteProjectDescription}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    {l.deleteConfirmLabel.replace("{name}", project.name)}
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
                  disabled={confirmDeleteName !== project.name || deleting}
                >
                  {deleting ? l.deleting : l.deleteButton}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <SystemPromptViewer
          entityType="project"
          projectId={project.id}
          title={`Project System Prompt Inspector (${name})`}
          embedded
        />
      )}
    </FormDialog>
  );
}
