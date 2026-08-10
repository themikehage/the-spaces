// SPDX-License-Identifier: MIT
import { useLiterals } from "@/lib";
import { ChevronRight, File, Folder, FolderOpen, Pencil, Trash2, UserPlus } from "lucide-react";
import { useCallback, useState } from "react";
import type { FileInfo } from "shared";
import { literals as u } from "./WorkspaceFileTree.literals";

export interface TreeNodeProps {
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

export function WorkspaceFileTreeNode({
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
    let colorClass = "text-muted-foreground";
    if (ext === "js" || ext === "jsx") colorClass = "text-file-js";
    else if (ext === "ts" || ext === "tsx") colorClass = "text-file-ts";
    else if (ext === "html") colorClass = "text-file-html";
    else if (ext === "css") colorClass = "text-file-css";
    else if (ext === "json") colorClass = "text-primary";
    else if (ext === "md") colorClass = "text-highlight";

    return <File size={16} className={`${colorClass} flex-shrink-0`} />;
  };

  return (
    <div className="select-none">
      <div
        className={`group flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-surfaceHover/50 transition-colors cursor-pointer border border-transparent min-h-[28px] ${
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
              className="p-1 hover:bg-surfaceHover rounded transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 cursor-pointer"
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

        <div className="hidden group-hover:flex md:group-hover:flex items-center gap-1 flex-shrink-0 ml-1.5">
          {file.isDirectory && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(file.path);
                  setAddingType("file");
                }}
                className="p-1.5 text-muted-foreground hover:text-primary rounded transition-colors cursor-pointer"
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
                className="p-1.5 text-muted-foreground hover:text-warning rounded transition-colors cursor-pointer"
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
            className="p-1.5 text-muted-foreground hover:text-primary rounded transition-colors cursor-pointer"
            title={l.rename}
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(file.path);
            }}
            className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer"
            title={l.delete}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

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

      {file.isDirectory && isExpanded && (
        <div className="overflow-hidden">
          {pathContents[file.path] && pathContents[file.path].length > 0 ? (
            pathContents[file.path].map((child) => (
              <WorkspaceFileTreeNode
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
