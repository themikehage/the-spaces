// SPDX-License-Identifier: MIT
import { ProjectSettingsModal } from "@/components/projects/ProjectSettingsModal";
import { Button } from "@/components/ui/Button";
import type { RepoItem } from "@/hooks/useDashboardData";
import { AnimatePresence } from "framer-motion";

interface CreateProjectModalProps {
  showModal: boolean;
  setShowModal: (val: boolean) => void;
  projectName: string;
  setRepoName: (val: string) => void;
  cloneUrl: string;
  setCloneUrl: (val: string) => void;
  avatarUrl: string;
  setAvatarUrl: (val: string) => void;
  submitting: boolean;
  submitError: string | null;
  setSubmitError: (val: string | null) => void;
  handleCreateRepo: (e: React.FormEvent) => Promise<void>;
  l: any;
}

export function CreateProjectModal({
  showModal,
  setShowModal,
  projectName,
  setRepoName,
  cloneUrl,
  setCloneUrl,
  avatarUrl,
  setAvatarUrl,
  submitting,
  submitError,
  setSubmitError,
  handleCreateRepo,
  l,
}: CreateProjectModalProps) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-input rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-base font-bold text-foreground mb-4">{l.createModalTitle}</h2>
        <form onSubmit={handleCreateRepo} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              {l.projectNameLabel}
            </label>
            <input
              type="text"
              required
              placeholder={l.projectNamePlaceholder}
              value={projectName}
              onChange={(e) => setRepoName(e.target.value)}
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
              {l.avatarUrlLabel}
            </label>
            <input
              type="text"
              placeholder={l.avatarUrlPlaceholder}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-input rounded-xl text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          {submitError && (
            <div className="p-3 bg-error/10 border border-error/20 text-error rounded-xl text-xs font-semibold">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowModal(false);
                setRepoName("");
                setCloneUrl("");
                setAvatarUrl("");
                setSubmitError(null);
              }}
            >
              {l.cancel}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? l.creating : l.createProject}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteProjectModalProps {
  deleteRepo: RepoItem | null;
  setDeleteRepo: (val: RepoItem | null) => void;
  confirmDeleteName: string;
  setConfirmDeleteName: (val: string) => void;
  deleting: boolean;
  handleDeleteRepoSubmit: (e: React.FormEvent) => Promise<void>;
  l: any;
}

export function DeleteProjectModal({
  deleteRepo,
  setDeleteRepo,
  confirmDeleteName,
  setConfirmDeleteName,
  deleting,
  handleDeleteRepoSubmit,
  l,
}: DeleteProjectModalProps) {
  if (!deleteRepo) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-input rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-base font-bold text-error mb-2">{l.deleteModalTitle}</h2>
        <p className="text-xs text-text-secondary mb-4 leading-relaxed font-body">
          {l.deleteDescription}
        </p>
        <form onSubmit={handleDeleteRepoSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              {l.confirmLabel.replace("{name}", deleteRepo.name)}
            </label>
            <input
              type="text"
              required
              placeholder={l.projectNamePlaceholderDelete}
              value={confirmDeleteName}
              onChange={(e) => setConfirmDeleteName(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-input rounded-xl text-sm text-foreground focus:outline-none focus:border-error"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setDeleteRepo(null);
                setConfirmDeleteName("");
              }}
            >
              {l.cancel}
            </Button>
            <Button
              variant="destructive"
              type="submit"
              disabled={confirmDeleteName !== deleteRepo.name || deleting}
            >
              {deleting ? l.deleting : l.deleteAnyway}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ProjectInfoModalProps {
  infoProject: RepoItem | null;
  setInfoProject: (val: RepoItem | null) => void;
  handleUpdateInfo: (updates: {
    name: string;
    cloneUrl: string | null;
    avatarUrl: string | null;
  }) => Promise<void>;
  handleUploadProjectAvatar: (id: string, file: File) => Promise<string>;
  handleDeleteProjectAvatar: (id: string) => Promise<void>;
}

export function ProjectInfoModal({
  infoProject,
  setInfoProject,
  handleUpdateInfo,
  handleUploadProjectAvatar,
  handleDeleteProjectAvatar,
}: ProjectInfoModalProps) {
  return (
    <AnimatePresence>
      {infoProject && (
        <ProjectSettingsModal
          project={{
            id: infoProject.id || infoProject.name,
            name: infoProject.name,
            cloneUrl: infoProject.cloneUrl,
            avatarUrl: infoProject.avatarUrl,
            createdAt: infoProject.createdAt,
            diskPath: infoProject.diskPath,
          }}
          onClose={() => setInfoProject(null)}
          onSave={handleUpdateInfo}
          onUploadAvatar={handleUploadProjectAvatar}
          onDeleteAvatar={handleDeleteProjectAvatar}
        />
      )}
    </AnimatePresence>
  );
}
