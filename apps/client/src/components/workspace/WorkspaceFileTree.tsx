// SPDX-License-Identifier: MIT
import { useLiterals } from "@/lib";
import type { FileInfo } from "@spaces/core";
import { ChevronRight, File, Folder, FolderOpen, Pencil, Trash2, UserPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { literals as u } from "./WorkspaceFileTree.literals";

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

interface TreeNodeProps {
  file: FileInfo;
  level: number;
  selectedPath: string | null;
  onSelectFile: (file: FileInfo) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (oldPath: string, newPath: string) => void;
  onCreate: (parentPath: string, name: string, type: "file" | "folder") => void;
  pathContents: Record<string, FileInfo[]>;
}

function TreeNode({
  file,
  level,
  selectedPath,
  onSelectFile,
  expandedPaths,
  onToggleExpand,
  onDelete,
  onRename,
  onCreate,
  pathContents,
}: TreeNodeProps) {
  const l = useLiterals(u);
  const isExpanded = expandedPaths.has(file.path);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.name);
  const [addingType, setAddingType] = useState<"file" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(file.path);
    },
    [file.path, onToggleExpand],
  );

  const handleClick = useCallback(() => {
    if (file.isDirectory) {
      onToggleExpand(file.path);
    } else {
      onSelectFile(file);
    }
  }, [file, onToggleExpand, onSelectFile]);

  const handleRenameSubmit = () => {
    if (editName && editName !== file.name) {
      const parts = file.path.split("/");
      parts[parts.length - 1] = editName;
      const newPath = parts.join("/");
      onRename(file.path, newPath);
    }
    setIsEditing(false);
  };

  const handleCreateSubmit = () => {
    if (newItemName && addingType) {
      onCreate(file.path, newItemName, addingType);
      setNewItemName("");
      setAddingType(null);
    }
  };

  const getFileIcon = () => {
    if (file.isDirectory) {
      return isExpanded ? (
        <FolderOpen size={16} className="text-warning flex-shrink-0" />
      ) : (
        <Folder size={16} className="text-warning flex-shrink-0" />
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    let color = "text-muted-foreground";
    if (ext === "js" || ext === "jsx") color = "text-[#f1e05a]";
    else if (ext === "ts" || ext === "tsx") color = "text-[#3178c6]";
    else if (ext === "html") color = "text-[#e34c26]";
    else if (ext === "css") color = "text-[#563d7c]";
    else if (ext === "json") color = "text-primary";
    else if (ext === "md") color = "text-highlight";

    return <File size={16} className={`${color} flex-shrink-0`} />;
  };

  return (
    <div className="select-none">
      <div
        className={`group flex items-center justify-between px-2 py-1 text-xs rounded hover:bg-surfaceHover/50 transition-colors cursor-pointer border border-transparent ${
          selectedPath === file.path
            ? "bg-surfaceHover border-primary/20 text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        style={{ paddingLeft: `${level * 12 + 6}px` }}
        onClick={handleClick}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {file.isDirectory ? (
            <button
              onClick={handleToggle}
              className="p-0.5 hover:bg-surfaceHover rounded transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 cursor-pointer"
            >
              <ChevronRight
                size={12}
                className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>
          ) : (
            <span className="w-[17px] flex-shrink-0" />
          )}

          {getFileIcon()}

          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-background border border-primary/50 outline-none text-foreground px-1 rounded text-xs py-0.5"
              autoFocus
            />
          ) : (
            <span className="truncate flex-1 font-mono">{file.name}</span>
          )}
        </div>

        {/* Tree Node Actions */}
        <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0 ml-1.5">
          {file.isDirectory && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(file.path);
                  setAddingType("file");
                }}
                className="p-1 text-muted-foreground hover:text-primary rounded transition-colors cursor-pointer"
                title={l.newFile}
              >
                <UserPlus size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(file.path);
                  setAddingType("folder");
                }}
                className="p-1 text-muted-foreground hover:text-warning rounded transition-colors cursor-pointer"
                title={l.newFolder}
              >
                <Folder size={12} />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 text-muted-foreground hover:text-primary rounded transition-colors cursor-pointer"
            title={l.rename}
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(file.path);
            }}
            className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer"
            title={l.delete}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Adding items inline */}
      {file.isDirectory && isExpanded && addingType && (
        <div
          className="flex items-center gap-1.5 px-2 py-1"
          style={{ paddingLeft: `${(level + 1) * 12 + 18}px` }}
        >
          {addingType === "folder" ? (
            <Folder size={14} className="text-warning flex-shrink-0" />
          ) : (
            <File size={14} className="text-muted-foreground flex-shrink-0" />
          )}
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onBlur={() => {
              // Wait slightly in case user clicked Enter
              setTimeout(() => setAddingType(null), 200);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateSubmit();
              if (e.key === "Escape") setAddingType(null);
            }}
            placeholder={`new ${addingType}...`}
            className="flex-1 min-w-0 bg-background border border-primary/50 outline-none text-foreground px-1 rounded text-xs py-0.5"
            autoFocus
          />
        </div>
      )}

      {/* Children Nodes */}
      {file.isDirectory && isExpanded && (
        <div className="overflow-hidden">
          {pathContents[file.path] && pathContents[file.path].length > 0 ? (
            pathContents[file.path].map((child) => (
              <TreeNode
                key={child.path}
                file={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
                onDelete={onDelete}
                onRename={onRename}
                onCreate={onCreate}
                pathContents={pathContents}
              />
            ))
          ) : (
            <div
              className="text-xs text-muted-foreground py-0.5 font-mono italic"
              style={{ paddingLeft: `${(level + 1) * 12 + 24}px` }}
            >
              (empty folder)
            </div>
          )}
        </div>
      )}
    </div>
  );
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
    <div className="space-y-0.5 max-h-full overflow-y-auto pr-1">
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
        <TreeNode
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
