// SPDX-License-Identifier: MIT
import { File, Folder } from "lucide-react";
import { useState } from "react";
import type { FileInfo } from "shared";
import { WorkspaceFileTreeNode } from "./WorkspaceFileTreeNode";

interface FileTreeProps {
  files: FileInfo[];
  selectedPath: string | null;
  onSelectFile: (file: FileInfo) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (oldPath: string, newPath: string) => void;
  onCreate: (parentPath: string, name: string, type: "file" | "folder") => void;
  pathContents: Record<string, FileInfo[]>;
  addingRootType: "file" | "folder" | null;
  onCancelAddingRoot: () => void;
}

export function WorkspaceFileTree({
  files,
  selectedPath,
  onSelectFile,
  expandedPaths,
  onToggleExpand,
  onDelete,
  onRename,
  onCreate,
  pathContents,
  addingRootType,
  onCancelAddingRoot,
}: FileTreeProps) {
  const [newRootName, setNewRootName] = useState("");

  const handleRootSubmit = () => {
    if (newRootName && addingRootType) {
      onCreate("", newRootName, addingRootType);
      setNewRootName("");
      onCancelAddingRoot();
    }
  };

  return (
    <div className="space-y-0.5 pr-1">
      {addingRootType && (
        <div className="flex items-center gap-1.5 px-2 py-1 pl-6">
          {addingRootType === "folder" ? (
            <Folder size={14} className="text-warning flex-shrink-0" />
          ) : (
            <File size={14} className="text-muted-foreground flex-shrink-0" />
          )}
          <input
            type="text"
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            onBlur={() => setTimeout(onCancelAddingRoot, 200)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRootSubmit();
              if (e.key === "Escape") onCancelAddingRoot();
            }}
            placeholder={`new ${addingRootType}...`}
            className="flex-1 min-w-0 bg-background border border-primary/50 outline-none text-foreground px-1 rounded text-xs py-0.5"
            autoFocus
          />
        </div>
      )}
      {files.map((file) => (
        <WorkspaceFileTreeNode
          key={file.path}
          file={file}
          level={0}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          expandedPaths={expandedPaths}
          onToggleExpand={onToggleExpand}
          onDelete={onDelete}
          onRename={onRename}
          onCreate={onCreate}
          pathContents={pathContents}
        />
      ))}
    </div>
  );
}
