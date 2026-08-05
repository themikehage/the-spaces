// SPDX-License-Identifier: MIT
import { useAuth } from "@/contexts/AuthContext";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { workspaceService } from "@/lib/api/workspace.service";
import { resolveFileUrl } from "@/lib/file-urls";
import { Download, ExternalLink, Image, Minus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ImageItem {
  url: string;
  title?: string;
}

interface Props {
  images: ImageItem[];
  sessionId: string | null;
  activeProjectName?: string | null;
  activeAgentId?: string | null;
  activeChannelId?: string | null;
  activeTeamId?: string | null;
}

export function resolveImageUrl(
  url: string,
  sessionId: string | null,
  activeProjectName?: string | null,
  activeAgentId?: string | null,
  activeChannelId?: string | null,
  activeTeamId?: string | null,
): string {
  return resolveFileUrl(url, sessionId, {
    project: activeProjectName,
    agentId: activeAgentId,
    channelId: activeChannelId,
    teamId: activeTeamId,
  });
}

interface AuthenticatedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export function AuthenticatedImage({ src, alt, className, ...props }: AuthenticatedImageProps) {
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { token } = useAuth();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const imgSrc =
    !src.startsWith("/api/") || !token
      ? src
      : `${src}${src.includes("?") ? "&" : "?"}token=${token}`;

  return (
    <div ref={containerRef} className="w-full h-full">
      {!inView ? (
        <div className="w-full h-full flex items-center justify-center bg-card animate-pulse">
          <Image size={24} className="text-muted-foreground" />
        </div>
      ) : (
        <img src={imgSrc} alt={alt} className={className} loading="lazy" {...props} />
      )}
    </div>
  );
}

export function ImageGrid({
  images,
  sessionId,
  activeProjectName,
  activeAgentId = null,
  activeChannelId = null,
  activeTeamId = null,
}: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { token } = useAuth();

  useEscapeKey(() => setPreviewUrl(null), Boolean(previewUrl));

  const downloadImage = useCallback(
    async (resolvedUrl: string, filename?: string) => {
      setDownloading(resolvedUrl);
      try {
        const res = await workspaceService.fetchWorkspaceUrl(resolvedUrl, {
          headers:
            resolvedUrl.startsWith("/api/") && token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;

        const ext = blob.type.split("/")[1] || "png";
        let downloadName = filename || "image";
        const hasExt = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(downloadName);
        if (!hasExt) {
          downloadName = `${downloadName}.${ext}`;
        }

        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch {
        const a = document.createElement("a");
        a.href = resolvedUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      } finally {
        setDownloading(null);
      }
    },
    [token],
  );

  const openImageInNewTab = async (resolvedUrl: string) => {
    try {
      const res = await workspaceService.fetchWorkspaceUrl(resolvedUrl, {
        headers:
          resolvedUrl.startsWith("/api/") && token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load image");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (err) {
      console.error("Failed to open image in new tab:", err);
    }
  };

  const downloadAll = useCallback(async () => {
    for (const img of images) {
      const resolved = resolveImageUrl(
        img.url,
        sessionId,
        activeProjectName,
        activeAgentId,
        activeChannelId,
        activeTeamId,
      );
      await downloadImage(resolved, img.title);
    }
  }, [
    images,
    sessionId,
    activeProjectName,
    activeAgentId,
    activeChannelId,
    activeTeamId,
    downloadImage,
  ]);

  if (images.length === 0) return null;

  return (
    <div className="my-3 font-sans">
      {images.length > 1 && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {images.length} image{images.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={downloadAll}
            disabled={downloading !== null}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs
                       text-muted-foreground hover:text-foreground hover:bg-card-hover/50
                       transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download size={10} />
            Download All
          </button>
        </div>
      )}
      {images.length === 1 ? (
        (() => {
          const img = images[0];
          const resolved = resolveImageUrl(
            img.url,
            sessionId,
            activeProjectName,
            activeAgentId,
            activeChannelId,
            activeTeamId,
          );
          const isDownloading = downloading === resolved;
          return (
            <div
              onClick={() => setPreviewUrl(resolved)}
              className="group relative rounded-lg overflow-hidden border border-input bg-card hover:border-primary/40 shadow-sm transition-all cursor-pointer max-w-full"
            >
              <div className="w-full overflow-hidden bg-black/10 flex items-center justify-center">
                <AuthenticatedImage
                  src={resolved}
                  alt={img.title || "Image content"}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                  className="w-full h-auto object-contain max-h-[70vh] transition-transform group-hover:scale-[1.02]"
                />
              </div>

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(resolved, img.title);
                  }}
                  disabled={isDownloading}
                  className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Download image"
                >
                  {isDownloading ? (
                    <Minus size={14} className="animate-spin text-white" />
                  ) : (
                    <Download size={14} className="text-white" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openImageInNewTab(resolved);
                  }}
                  className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors cursor-pointer"
                  title="Open in new tab"
                >
                  <ExternalLink size={14} className="text-white" />
                </button>
              </div>

              {img.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-foreground truncate">
                  {img.title}
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-full">
          {images.map((img, i) => {
            const resolved = resolveImageUrl(
              img.url,
              sessionId,
              activeProjectName,
              activeAgentId,
              activeChannelId,
              activeTeamId,
            );
            const isDownloading = downloading === resolved;
            return (
              <div
                key={i}
                onClick={() => setPreviewUrl(resolved)}
                className="group relative rounded-lg overflow-hidden border border-input bg-card hover:border-primary/40 shadow-sm transition-all cursor-pointer"
              >
                <div className="aspect-square w-full overflow-hidden bg-black/10 flex items-center justify-center">
                  <AuthenticatedImage
                    src={resolved}
                    alt={img.title || "Image content"}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(resolved, img.title);
                    }}
                    disabled={isDownloading}
                    className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Download image"
                  >
                    {isDownloading ? (
                      <Minus size={14} className="animate-spin text-white" />
                    ) : (
                      <Download size={14} className="text-white" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openImageInNewTab(resolved);
                    }}
                    className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors cursor-pointer"
                    title="Open in new tab"
                  >
                    <ExternalLink size={14} className="text-white" />
                  </button>
                </div>

                {img.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-foreground truncate">
                    {img.title}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="fixed top-4 right-4 z-[60] p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} className="text-white" />
          </button>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <AuthenticatedImage
              src={previewUrl}
              alt="Preview"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
