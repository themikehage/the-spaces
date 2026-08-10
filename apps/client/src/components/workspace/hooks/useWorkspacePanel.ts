// SPDX-License-Identifier: MIT
import { workspaceService, type ScopeOptions } from "@/lib/api/workspace.service";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FileInfo } from "shared";

export function useWorkspacePanel(scope: ScopeOptions) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [pathContents, setPathContents] = useState<Record<string, FileInfo[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingRootType, setAddingRootType] = useState<"file" | "folder" | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeletePath, setPendingDeletePath] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadWorkspace = useCallback(
    async (path = "") => {
      setLoading(true);
      setError(null);
      try {
        const data = await workspaceService.getWorkspaceNode(path, scope);
        if (data.isDirectory) {
          if (path === "") {
            setFiles(data.children || []);
          } else {
            setPathContents((prev) => ({
              ...prev,
              [path]: data.children || [],
            }));
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to load workspace");
      } finally {
        setLoading(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const reloadWorkspace = useCallback(async () => {
    await loadWorkspace("");
    const paths = Array.from(expandedPaths);
    for (const path of paths) {
      await loadWorkspace(path);
    }
  }, [expandedPaths, loadWorkspace]);

  useEffect(() => {
    window.addEventListener("workspaceUpdated", reloadWorkspace);
    return () => {
      window.removeEventListener("workspaceUpdated", reloadWorkspace);
    };
  }, [reloadWorkspace]);

  const handleToggleExpand = useCallback(
    async (path: string) => {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          if (!pathContents[path]) {
            loadWorkspace(path);
          }
        }
        return next;
      });
    },
    [pathContents, loadWorkspace],
  );

  const [mobileTab, setMobileTab] = useState<"tree" | "editor">("tree");

  const handleSelectFile = useCallback(
    async (file: FileInfo) => {
      setLoading(true);
      setError(null);
      setMobileTab("editor");
      try {
        const data = await workspaceService.getWorkspaceNode(file.path, scope);
        setSelectedFile(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to open file");
      } finally {
        setLoading(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    const handleOpenFile = (e: Event) => {
      const customEvt = e as CustomEvent<{ path: string }>;
      const targetPath = customEvt.detail.path;
      if (targetPath) {
        if (targetPath.includes("/")) {
          const parts = targetPath.split("/");
          let current = "";
          setExpandedPaths((prev) => {
            const next = new Set(prev);
            for (let i = 0; i < parts.length - 1; i++) {
              current = current ? `${current}/${parts[i]}` : parts[i];
              next.add(current);
              if (!pathContents[current]) {
                loadWorkspace(current);
              }
            }
            return next;
          });
        }

        handleSelectFile({
          name: targetPath.split("/").pop() || "",
          path: targetPath,
          isDirectory: false,
          size: 0,
          lastModified: new Date().toISOString(),
        });
      }
    };
    window.addEventListener("openWorkspaceFile", handleOpenFile);
    return () => {
      window.removeEventListener("openWorkspaceFile", handleOpenFile);
    };
  }, [pathContents, loadWorkspace, handleSelectFile]);

  const handleSaveFile = useCallback(
    async (path: string, content: string) => {
      const data = await workspaceService.saveWorkspaceFile(path, content, scope);
      setSelectedFile(data);
    },
    [scope],
  );

  const handleCreate = useCallback(
    async (parentPath: string, name: string, type: "file" | "folder") => {
      try {
        await workspaceService.createWorkspaceNode(parentPath, name, type, scope);
        await loadWorkspace(parentPath);
        if (parentPath !== "") {
          setExpandedPaths((prev) => {
            const next = new Set(prev);
            next.add(parentPath);
            return next;
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Create failed");
      }
    },
    [loadWorkspace, scope],
  );

  const handleRename = useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        const data = await workspaceService.renameWorkspaceNode(oldPath, newPath, scope);
        const parentOfOld = oldPath.includes("/")
          ? oldPath.substring(0, oldPath.lastIndexOf("/"))
          : "";
        const parentOfNew = newPath.includes("/")
          ? newPath.substring(0, newPath.lastIndexOf("/"))
          : "";
        await loadWorkspace(parentOfOld);
        if (parentOfNew !== parentOfOld) {
          await loadWorkspace(parentOfNew);
        }
        if (selectedFile?.path === oldPath) {
          setSelectedFile(data);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Rename failed");
      }
    },
    [selectedFile, loadWorkspace, scope],
  );

  const executeDelete = useCallback(async () => {
    if (!pendingDeletePath) return;
    setDeleting(true);
    try {
      await workspaceService.deleteWorkspaceNode(pendingDeletePath, scope);
      const parentPath = pendingDeletePath.includes("/")
        ? pendingDeletePath.substring(0, pendingDeletePath.lastIndexOf("/"))
        : "";
      await loadWorkspace(parentPath);
      if (selectedFile?.path === pendingDeletePath) {
        setSelectedFile(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Delete failed");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setPendingDeletePath(null);
    }
  }, [pendingDeletePath, selectedFile, loadWorkspace, scope]);

  const handleDelete = useCallback((path: string) => {
    setPendingDeletePath(path);
    setShowDeleteConfirm(true);
  }, []);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const query = searchQuery.toLowerCase();
    const filterRecurse = (items: FileInfo[]): FileInfo[] => {
      return items
        .map((item) => {
          if (item.isDirectory) {
            const childrenKey = item.path;
            const children = pathContents[childrenKey] || [];
            const filteredChildren = filterRecurse(children);
            if (filteredChildren.length > 0 || item.name.toLowerCase().includes(query)) {
              return {
                ...item,
                children: filteredChildren,
              };
            }
          } else if (item.name.toLowerCase().includes(query)) {
            return item;
          }
          return null;
        })
        .filter(Boolean) as FileInfo[];
    };
    return filterRecurse(files);
  }, [files, pathContents, searchQuery]);

  return {
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
  };
}
