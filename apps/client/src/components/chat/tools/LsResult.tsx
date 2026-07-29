// SPDX-License-Identifier: MIT
import { File, Folder, Image } from "lucide-react";
import { openInWorkspace } from "./workspace";

function getExtColor(name: string): string {
  if (name.endsWith("/")) return "text-primary";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["js", "ts", "tsx", "jsx"].includes(ext)) return "text-warning";
  if (["html", "htm"].includes(ext)) return "text-highlight";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return "text-primary";
  if (["md", "txt"].includes(ext)) return "text-muted-foreground";
  if (["json", "yaml", "yml", "toml"].includes(ext)) return "text-primary/70";
  return "text-muted-foreground";
}

function FolderIcon() {
  return <Folder size={12} className="text-primary flex-shrink-0" />;
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
    return <Image size={12} className="text-primary flex-shrink-0" />;
  }
  return <File size={12} className="text-muted-foreground flex-shrink-0" />;
}

interface Props {
  text: string;
}

export function LsResult({ text }: Props) {
  const entries = text.trim().split("\n").filter(Boolean);

  if (entries.length === 0) {
    return <p className="text-muted-foreground text-xs italic">Empty directory</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
      {entries.map((entry, i) => {
        const isDir = entry.endsWith("/");
        const name = entry;
        return (
          <button
            key={i}
            onClick={() => openInWorkspace(name)}
            className="flex items-center gap-1.5 py-0.5 min-w-0 hover:bg-card-hover/40 rounded px-1 -mx-1 transition-colors cursor-pointer w-full text-left"
          >
            {isDir ? <FolderIcon /> : <FileIcon name={name} />}
            <span
              className={`font-mono text-[11px] truncate ${getExtColor(name)} hover:underline underline-offset-2`}
            >
              {name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
