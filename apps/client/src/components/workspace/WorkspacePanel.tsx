// SPDX-License-Identifier: MIT
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Folder, RefreshCw, UserPlus } from "lucide-react";
import { useMemo } from "react";
import { WorkspaceFileEditor } from "./WorkspaceFileEditor";
import { WorkspaceFileTree } from "./WorkspaceFileTree";
import { useWorkspacePanel } from "./hooks/useWorkspacePanel";

interface Props {
  activeProjectName: string | null;
  activeAgentId?: string | null;
  activeChannelId?: string | null;
  activeTeamId?: string | null;
}

export function WorkspacePanel({
  activeProjectName,
  activeAgentId = null,
  activeChannelId = null,
  activeTeamId = null,
}: Props) {
  const scope = useMemo(
    () => ({ activeProjectName, activeAgentId, activeChannelId, activeTeamId }),
    [activeProjectName, activeAgentId, activeChannelId, activeTeamId],
  );

  const {
    files,
    selectedFile,
    expandedPaths,
    pathContents,
    searchQuery,
    loading,
    error,
    addingRootType,
    showDeleteConfirm,
    pendingDeletePath,
    deleting,
    filteredFiles,
    mobileTab,
    setMobileTab,
    loadWorkspace,
    handleToggleExpand,
    handleSelectFile,
    handleSaveFile,
    handleCreate,
    handleRename,
    handleDelete,
    executeDelete,
    setSearchQuery,
    setAddingRootType,
    setShowDeleteConfirm,
    setPendingDeletePath,
    setError,
  } = useWorkspacePanel(scope);

  return (
    <div className="w-full h-full flex flex-col bg-card overflow-hidden border-l border-border select-none">
      {error && (
        <div className="px-3 py-1.5 bg-destructive/10 border-b border-error/20 text-destructive text-xs flex items-center justify-between flex-shrink-0">
          <span className="truncate">{error}</span>
          <button
            onClick={() => setError(null)}
            className="underline cursor-pointer flex-shrink-0 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        <div
          className={`${
            mobileTab === "tree" ? "flex" : "hidden"
          } md:flex w-full md:w-64 lg:w-64 border-b md:border-b-0 md:border-r border-border flex-col overflow-hidden p-3 bg-card/20 flex-shrink-0 h-full`}
        >
          <div className="mb-2.5 flex-shrink-0">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-input hover:border-primary/40 focus:border-primary outline-none text-foreground px-2.5 py-1 rounded text-xs transition-all font-sans"
            />
          </div>

          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50 flex-shrink-0 text-muted-foreground">
            <span className="text-xs uppercase tracking-wider font-semibold">
              Files {files.length > 0 ? `(${filteredFiles.length})` : ""}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => loadWorkspace("")}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-surfaceHover/50 rounded transition-colors cursor-pointer"
                title="Refresh Root"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setAddingRootType("file")}
                className="p-1 text-muted-foreground hover:text-primary rounded transition-colors cursor-pointer"
                title="New File in Root"
              >
                <UserPlus size={14} />
              </button>
              <button
                onClick={() => setAddingRootType("folder")}
                className="p-1 text-muted-foreground hover:text-warning rounded transition-colors cursor-pointer"
                title="New Folder in Root"
              >
                <Folder size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 touch-pan-y">
            {loading && files.length === 0 ? (
              <div className="h-24 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredFiles.length === 0 && searchQuery ? (
              <div className="py-6 text-center text-xs text-muted-foreground italic font-sans">
                No matching files found
              </div>
            ) : (
              <WorkspaceFileTree
                files={filteredFiles}
                selectedPath={selectedFile?.path || null}
                onSelectFile={handleSelectFile}
                expandedPaths={expandedPaths}
                onToggleExpand={handleToggleExpand}
                onDelete={handleDelete}
                onRename={handleRename}
                onCreate={handleCreate}
                pathContents={pathContents}
                addingRootType={addingRootType}
                onCancelAddingRoot={() => setAddingRootType(null)}
              />
            )}
          </div>
        </div>

        <div
          className={`${
            mobileTab === "editor" ? "flex" : "hidden"
          } md:flex flex-1 min-w-0 overflow-hidden flex-col bg-background h-full`}
        >
          <WorkspaceFileEditor
            file={selectedFile}
            activeProjectName={activeProjectName}
            activeAgentId={activeAgentId}
            activeChannelId={activeChannelId}
            activeTeamId={activeTeamId}
            onSave={handleSaveFile}
            onBackToFiles={() => setMobileTab("tree")}
          />
        </div>
      </div>
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPendingDeletePath(null);
        }}
        onConfirm={executeDelete}
        title="Delete"
        message={`Are you sure you want to delete ${pendingDeletePath?.split("/").pop() ?? ""}?`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  );
}
