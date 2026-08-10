// SPDX-License-Identifier: MIT
import { workspaceService, type ScopeOptions } from "@/lib/api/workspace.service";
import { useCallback, useEffect, useState } from "react";
import type { FileInfo } from "shared";

function decodeBase64Unicode(str: string): string {
  try {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

export function useWorkspaceEditor(
  file: FileInfo | null,
  scope: ScopeOptions,
  onSave: (path: string, content: string) => Promise<void>,
  fallbackSaveErrorText = "Failed to save file",
) {
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const isImage = file?.mimeType?.startsWith("image/") || false;
  const isHtml = file?.name.endsWith(".html") || file?.name.endsWith(".htm") || false;
  const isText =
    file?.mimeType?.startsWith("text/") ||
    file?.mimeType === "application/json" ||
    file?.mimeType === "application/javascript" ||
    file?.mimeType === "application/typescript" ||
    file?.name.endsWith(".json") ||
    file?.name.endsWith(".md") ||
    file?.name.endsWith(".ts") ||
    file?.name.endsWith(".tsx") ||
    file?.name.endsWith(".js") ||
    file?.name.endsWith(".jsx") ||
    file?.name.endsWith(".html") ||
    file?.name.endsWith(".css") ||
    file?.name.endsWith(".env") ||
    file?.name.endsWith(".yml") ||
    file?.name.endsWith(".yaml") ||
    false;

  useEffect(() => {
    if (file) {
      if (isText && file.content) {
        setContent(decodeBase64Unicode(file.content));
      } else {
        setContent("");
      }
      setDirty(false);
      setSaveStatus("idle");
      setErrorMsg("");
      setActiveTab(isHtml ? "preview" : "code");
      setIsFullscreen(false);
    } else {
      setContent("");
      setDirty(false);
      setActiveTab("code");
      setIsFullscreen(false);
    }
  }, [file, isText, isHtml]);

  const handleSave = useCallback(async () => {
    if (!file || saving) return;
    setSaving(true);
    setSaveStatus("idle");
    setErrorMsg("");
    try {
      await onSave(file.path, content);
      setDirty(false);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveStatus("error");
      setErrorMsg(msg || fallbackSaveErrorText);
    } finally {
      setSaving(false);
    }
  }, [file, content, onSave, saving, fallbackSaveErrorText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  useEffect(() => {
    if (!file) {
      setPreviewBlobUrl(null);
      return;
    }
    let active = true;
    let createdUrl = "";

    const loadBlob = async () => {
      if (!isHtml && !isImage) {
        setPreviewBlobUrl(null);
        return;
      }
      try {
        const url = await workspaceService.getFileRawBlobUrl(file.path, scope);
        if (active) {
          createdUrl = url;
          setPreviewBlobUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch {
        if (active) setPreviewBlobUrl(null);
      }
    };

    loadBlob();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [file?.path, scope, isHtml, isImage, saveStatus]);

  const handleOpenRaw = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!file) return;
      if (previewBlobUrl) {
        window.open(previewBlobUrl, "_blank");
      } else {
        try {
          const url = await workspaceService.getFileRawBlobUrl(file.path, scope);
          window.open(url, "_blank");
        } catch (err: unknown) {
          console.error("Error opening file:", err);
        }
      }
    },
    [file, previewBlobUrl, scope],
  );

  const handleDownload = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!file) return;
      try {
        await workspaceService.downloadWorkspaceFile(file.path, file.name, scope);
      } catch (err: unknown) {
        console.error("Error downloading file:", err);
      }
    },
    [file, scope],
  );

  return {
    content,
    setContent,
    dirty,
    setDirty,
    saving,
    saveStatus,
    errorMsg,
    activeTab,
    setActiveTab,
    isFullscreen,
    setIsFullscreen,
    previewBlobUrl,
    isImage,
    isHtml,
    isText,
    handleSave,
    handleKeyDown,
    handleOpenRaw,
    handleDownload,
  };
}
