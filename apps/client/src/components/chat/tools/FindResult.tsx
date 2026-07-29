// SPDX-License-Identifier: MIT
import { File, Image } from "lucide-react";
import { openInWorkspace } from "./workspace";

function getExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function FileIcon({ name }: { name: string }) {
  const ext = getExt(name);
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
    return <Image size={12} className="text-primary flex-shrink-0" />;
  }
  return <File size={12} className="text-primary/60 flex-shrink-0" />;
}

interface Props {
  text: string;
}

export function FindResult({ text }: Props) {
  const files = text.trim().split("\n").filter(Boolean);

  if (files.length === 0) {
    return <p className="text-muted-foreground text-xs italic">No files matched</p>;
  }

  return (
    <div className="space-y-0.5">
      {files.map((file, i) => (
        <button
          key={i}
          onClick={() => openInWorkspace(file)}
          className="flex items-center gap-1.5 py-0.5 hover:bg-card-hover/40 rounded px-1 -mx-1 transition-colors cursor-pointer w-full text-left"
        >
          <FileIcon name={file} />
          <span className="font-mono text-[11px] text-primary/80 hover:underline underline-offset-2">
            {file}
          </span>
        </button>
      ))}
    </div>
  );
}
