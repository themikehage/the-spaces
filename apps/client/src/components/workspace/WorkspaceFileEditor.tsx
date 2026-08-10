// SPDX-License-Identifier: MIT
import { TabsNav } from "@/components/ui/TabsNav";
import { useLiterals } from "@/lib";
import { Check, ChevronLeft, Download, ExternalLink, File, Maximize } from "lucide-react";
import { useMemo } from "react";
import type { FileInfo } from "shared";
import { literals as u } from "./WorkspaceFileEditor.literals";
import { useWorkspaceEditor } from "./hooks/useWorkspaceEditor";

interface Props {
  file: FileInfo | null;
  activeProjectName: string | null;
  activeAgentId?: string | null;
  activeChannelId?: string | null;
  activeTeamId?: string | null;
  onSave: (path: string, content: string) => Promise<void>;
  onBackToFiles?: () => void;
}

const EXT_LANGUAGE_MAP: Record<string, string> = {
  ts: "language-typescript",
  tsx: "language-tsx",
  js: "language-javascript",
  jsx: "language-jsx",
  json: "language-json",
  py: "language-python",
  html: "language-html",
  htm: "language-html",
  css: "language-css",
  env: "language-bash",
  yml: "language-yaml",
  yaml: "language-yaml",
  md: "language-markdown",
};

function getLanguageClass(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return EXT_LANGUAGE_MAP[ext] || "";
}

export function WorkspaceFileEditor({
  file,
  activeProjectName,
  activeAgentId = null,
  activeChannelId = null,
  activeTeamId = null,
  onSave,
  onBackToFiles,
}: Props) {
  const l = useLiterals(u);
  const scope = useMemo(
    () => ({ activeProjectName, activeAgentId, activeChannelId, activeTeamId }),
    [activeProjectName, activeAgentId, activeChannelId, activeTeamId],
  );

  const {
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
  } = useWorkspaceEditor(file, scope, onSave, l.saveError);

  const breadcrumbs = useMemo(() => {
    if (!file?.path) return [];
    return file.path.split("/");
  }, [file?.path]);

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground font-sans border-t border-border sm:border-t-0 sm:border-l border-border p-4 text-center">
        {onBackToFiles && (
          <button
            onClick={onBackToFiles}
            className="mb-4 md:hidden inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline cursor-pointer"
          >
            <ChevronLeft size={14} />
            Back to files
          </button>
        )}
        <File size={32} className="mb-2" />
        <p className="text-xs">Select a file to inspect or edit</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background border-t border-border sm:border-t-0 sm:border-l border-border">
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col font-sans select-none animate-fade-in">
          <div className="h-10 px-4 border-b border-border flex items-center justify-between bg-background flex-shrink-0">
            <span className="text-xs font-mono font-semibold text-foreground truncate">
              Fullscreen Preview - {file.name}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenRaw}
                className="px-2.5 py-1 bg-surfaceHover hover:bg-surfaceHover/80 text-foreground text-xs rounded font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                New Tab
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-2.5 py-1 bg-primary hover:bg-primary/80 text-foreground text-xs rounded font-semibold transition-colors cursor-pointer"
              >
                Exit Fullscreen
              </button>
            </div>
          </div>
          <div className="flex-1 w-full h-full bg-white">
            <iframe
              src={previewBlobUrl || undefined}
              className="w-full h-full border-0"
              title={l.fullscreen}
            />
          </div>
        </div>
      )}

      <div className="h-9 px-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-background/80">
        <div className="flex items-center gap-2 min-w-0">
          {onBackToFiles && (
            <button
              onClick={onBackToFiles}
              className="md:hidden p-1 hover:bg-surfaceHover rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Back to files"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground truncate min-w-0">
            {breadcrumbs.length > 1 && (
              <span className="hidden sm:inline truncate max-w-[120px] opacity-70">
                {breadcrumbs.slice(0, -1).join("/")}/
              </span>
            )}
            <span className="font-semibold text-foreground truncate">{file.name}</span>
          </div>
          {dirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
          )}

          {isHtml && (
            <TabsNav
              variant="segmented"
              size="sm"
              tabs={[
                { id: "code", label: "Code" },
                { id: "preview", label: "Preview" },
              ]}
              activeTab={activeTab}
              onChange={(t) => setActiveTab(t as "code" | "preview")}
              className="ml-2"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "success" && (
            <span className="text-xs text-primary font-sans flex items-center gap-1 animate-fade-in">
              <Check size={12} />
              Saved
            </span>
          )}

          {saveStatus === "error" && (
            <span
              className="text-xs text-destructive font-sans truncate max-w-[100px]"
              title={errorMsg}
            >
              Error
            </span>
          )}

          {isText && activeTab === "code" && (
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-sans font-semibold transition-all cursor-pointer ${
                dirty
                  ? "bg-primary text-foreground hover:bg-primary/80 active:scale-95 shadow-sm"
                  : "bg-surfaceHover/30 text-muted-foreground cursor-not-allowed"
              }`}
            >
              {saving ? (
                <div className="w-2.5 h-2.5 border border-text-primary border-t-transparent rounded-full animate-spin" />
              ) : null}
              {saving ? l.saving : l.save}
            </button>
          )}

          {isHtml && activeTab === "preview" && (
            <>
              <button
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-semibold text-muted-foreground hover:text-foreground hover:bg-surfaceHover/50 transition-colors cursor-pointer"
                title="Fullscreen Preview"
              >
                <Maximize size={11} />
                Fullscreen
              </button>
              <button
                onClick={handleOpenRaw}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-semibold text-muted-foreground hover:text-foreground hover:bg-surfaceHover/50 transition-colors cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink size={11} />
                New Tab
              </button>
            </>
          )}

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-semibold text-muted-foreground hover:text-foreground hover:bg-surfaceHover/50 transition-colors cursor-pointer"
            title="Download file"
          >
            <Download size={11} />
            Download
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 relative">
        {isText && activeTab === "code" ? (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className={`w-full h-full bg-transparent text-foreground font-mono text-[11px] leading-relaxed p-3.5 outline-none resize-none border-0 focus:ring-0 ${file ? getLanguageClass(file.name) : ""}`}
            placeholder="File is empty"
          />
        ) : isHtml && activeTab === "preview" ? (
          <div className="w-full h-full bg-white">
            <iframe
              src={previewBlobUrl || undefined}
              className="w-full h-full border-0"
              title="HTML Preview Pane"
            />
          </div>
        ) : isImage ? (
          <div className="w-full h-full overflow-auto bg-black/10 flex items-center justify-center p-4">
            <img
              src={previewBlobUrl || undefined}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded border border-border shadow-md"
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground font-sans p-6 text-center">
            <Download size={24} className="text-muted-foreground mb-2" />
            <p className="text-xs mb-3 font-semibold">Binary or unsupported preview file type</p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              File: {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
            <button
              onClick={handleDownload}
              className="px-4 py-1.5 bg-surfaceHover hover:bg-surfaceHover/80 text-foreground text-xs rounded font-semibold transition-colors cursor-pointer"
            >
              Download File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
