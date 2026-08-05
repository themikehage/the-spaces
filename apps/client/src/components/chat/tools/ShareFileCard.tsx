// SPDX-License-Identifier: MIT
import { Button } from "@/components/ui/Button";
import { workspaceService } from "@/lib/api/workspace.service";
import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { resolveImageUrl } from "../ImageGrid";

interface Props {
  filePath: string;
  title?: string;
  sessionId: string | null;
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeChannelId?: string | null;
  activeTeamId?: string | null;
}

const EXT_ICONS: Record<string, string> = {
  pdf: "PDF",
  doc: "DOC",
  docx: "DOC",
  xls: "XLS",
  xlsx: "XLS",
  ppt: "PPT",
  pptx: "PPT",
  zip: "ZIP",
  rar: "ZIP",
  "7z": "ZIP",
  tar: "ZIP",
  gz: "ZIP",
  csv: "CSV",
  txt: "TXT",
  json: "JSON",
  xml: "XML",
  html: "HTML",
  png: "IMG",
  jpg: "IMG",
  jpeg: "IMG",
  gif: "IMG",
  svg: "SVG",
  webp: "IMG",
  mp3: "MP3",
  wav: "WAV",
  mp4: "MP4",
  mov: "MP4",
};

const EXT_COLORS: Record<string, string> = {
  PDF: "bg-red-500/20 text-red-400",
  DOC: "bg-blue-500/20 text-blue-400",
  XLS: "bg-green-500/20 text-green-400",
  PPT: "bg-orange-500/20 text-orange-400",
  ZIP: "bg-yellow-500/20 text-yellow-400",
  CSV: "bg-emerald-500/20 text-emerald-400",
  IMG: "bg-purple-500/20 text-purple-400",
  SVG: "bg-pink-500/20 text-pink-400",
  JSON: "bg-cyan-500/20 text-cyan-400",
  HTML: "bg-indigo-500/20 text-indigo-400",
};

function getExtension(filePath: string): string {
  const name = filePath.split(/[\\/]/).pop() || "";
  const dotIdx = name.lastIndexOf(".");
  return dotIdx > 0 ? name.substring(dotIdx + 1).toLowerCase() : "";
}

function getIconLabel(filePath: string): string {
  const ext = getExtension(filePath);
  return EXT_ICONS[ext] || ext.toUpperCase().substring(0, 3) || "FILE";
}

function getColorClass(filePath: string): string {
  const label = getIconLabel(filePath);
  return EXT_COLORS[label] || "bg-surface-hover text-muted-foreground";
}

export function ShareFileCard({
  filePath,
  title,
  sessionId,
  activeProjectName,
  activeAgentId,
  activeChannelId,
  activeTeamId,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const fileName = filePath.split(/[\\/]/).pop() || filePath;
  const displayName = title || fileName;
  const iconLabel = getIconLabel(filePath);
  const colorClass = getColorClass(filePath);

  const downloadUrl = resolveImageUrl(
    filePath,
    sessionId,
    activeProjectName,
    activeAgentId,
    activeChannelId,
    activeTeamId,
  );
  const fullDownloadUrl = downloadUrl.includes("?")
    ? `${downloadUrl}&download=1`
    : `${downloadUrl}?download=1`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = "";
      const res = await workspaceService.fetchWorkspaceUrl(fullDownloadUrl, {
        headers: token ? {} : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download file:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-surface border border-input/40 rounded-xl p-3 my-2 max-w-sm">
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono ${colorClass}`}
      >
        {iconLabel}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-foreground truncate">{displayName}</div>
        <div className="text-[10px] text-muted-foreground truncate font-mono">{fileName}</div>
      </div>
      <Button variant="solid" size="sm" onClick={handleDownload} disabled={downloading}>
        {downloading ? <LoaderCircle className="animate-spin" size={12} /> : <Download size={12} />}
        {downloading ? "..." : "Download"}
      </Button>
    </div>
  );
}
