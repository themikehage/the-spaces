// SPDX-License-Identifier: MIT
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useLiterals } from "@/lib";
import { apiFetch } from "@/lib/api";
import { wsClient } from "@/lib/ws-client";
import { ExternalLink, Folder, Play, RefreshCw, Settings, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PreviewState } from "shared";
import { literals as u } from "./PreviewPanel.literals";

interface Props {
  activeProjectName: string | null;
}

const FRAMEWORK_LABELS: Record<string, string> = {
  auto: "Auto-detect",
  vite: "Vite",
  next: "Next.js",
  nuxt: "Nuxt",
  astro: "Astro",
  html: "Static HTML",
  custom: "Custom",
};

function usePreviewStatus(projectName: string) {
  const [state, setState] = useState<PreviewState | null>(null);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [previewBaseUrl, setPreviewBaseUrl] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.previewBaseUrl) setPreviewBaseUrl(data.previewBaseUrl);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectName) return;
    apiFetch(`/api/preview/state?project=${encodeURIComponent(projectName)}`)
      .then((r) => r.json())
      .then((data) => setState(data))
      .catch(() => {});
  }, [projectName]);

  const fetchConfig = useCallback(async () => {
    if (!projectName) return null;
    try {
      const r = await apiFetch(`/api/preview/config?project=${encodeURIComponent(projectName)}`);
      return await r.json();
    } catch {
      return null;
    }
  }, [projectName]);

  useEffect(() => {
    if (!projectName) return;

    const unsubStatus = wsClient.subscribe("preview_status", (raw) => {
      const data = raw as any;
      if (data.projectName !== projectName) return;
      setState((prev) => ({
        projectName: data.projectName,
        status: data.status || prev?.status || "idle",
        distExists: data.distExists ?? prev?.distExists ?? false,
        indexHtmlExists: data.indexHtmlExists ?? prev?.indexHtmlExists ?? false,
        lastBuildAt: data.lastBuildAt ?? prev?.lastBuildAt ?? null,
        error: data.error,
        config: data.config || prev?.config,
      }));
    });

    const unsubLog = wsClient.subscribe("preview_build_log", (raw) => {
      const data = raw as any;
      if (data.projectName !== projectName) return;
      setBuildLogs((prev) => [...prev, data.line]);
    });

    return () => {
      unsubStatus();
      unsubLog();
    };
  }, [projectName]);

  return { state, buildLogs, setBuildLogs, fetchConfig, previewBaseUrl };
}

export function PreviewPanel({ activeProjectName }: Props) {
  const l = useLiterals(u);
  const projectName = activeProjectName || "";
  const { user } = useAuth();
  const {
    state: previewState,
    buildLogs,
    setBuildLogs,
    fetchConfig,
    previewBaseUrl: runtimePreviewBase,
  } = usePreviewStatus(projectName);
  const [buildKey, setBuildKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    framework: "auto",
    buildCommand: "",
    outputDir: "",
  });
  const [saving, setSaving] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [buildLogs, logOpen]);

  // Use server-provided PREVIEW_BASE_URL if available (set via env var in production).
  // Falls back to port 3001 for local development.
  const PREVIEW_BASE =
    runtimePreviewBase ||
    (import.meta.env.VITE_PREVIEW_BASE_URL as string | undefined) ||
    `${window.location.protocol}//${window.location.hostname}:3001`;

  const previewSrc =
    projectName && user?.username
      ? `${PREVIEW_BASE}/${encodeURIComponent(user.username)}/${encodeURIComponent(projectName)}/index.html`
      : null;

  const lastBuildAt = previewState?.lastBuildAt ?? null;
  const iframeKey = `${previewSrc}-${buildKey}-${lastBuildAt}`;

  const handleOpenConfig = useCallback(async () => {
    setConfigOpen(true);
    const cfg = await fetchConfig();
    if (cfg) {
      setConfigForm({
        framework: cfg.framework || "auto",
        buildCommand: cfg.buildCommand || "",
        outputDir: cfg.outputDir || "",
      });
    }
  }, [fetchConfig]);

  const handleSaveConfig = useCallback(async () => {
    if (!projectName) return;
    setSaving(true);
    try {
      await apiFetch(`/api/preview/config?project=${encodeURIComponent(projectName)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configForm),
      });
      setConfigOpen(false);
      setBuildLogs([]);
    } finally {
      setSaving(false);
    }
  }, [projectName, configForm, setBuildLogs]);

  const handleBuildNow = useCallback(async () => {
    if (!projectName) return;
    setBuildLogs([]);
    setLogOpen(true);
    try {
      await apiFetch(`/api/preview/build?project=${encodeURIComponent(projectName)}`, {
        method: "POST",
      });
    } catch { /* noop */ }
  }, [projectName, setBuildLogs]);

  const handleReload = useCallback(() => {
    setBuildKey((k) => k + 1);
  }, []);

  const handleOpenNewTab = useCallback(() => {
    if (previewSrc) window.open(previewSrc, "_blank", "noreferrer");
  }, [previewSrc]);

  const isBuilding = previewState?.status === "building";

  const statusBadge = () => {
    const base = "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border";
    switch (previewState?.status) {
      case "building":
        return (
          <div className={`${base} bg-warning/10 border-warning/30 text-warning`}>
            <div className="w-3 h-3 border-2 border-warning border-t-transparent rounded-full animate-spin" />
            Building...
          </div>
        );
      case "ready":
        return (
          <div className={`${base} bg-primary/10 border-success/30 text-primary`}>
            <div className="w-3 h-3 rounded-full bg-primary" />
            Ready
          </div>
        );
      case "error":
        return (
          <div className={`${base} bg-destructive/10 border-error/30 text-destructive`}>
            <div className="w-3 h-3 rounded-full bg-destructive" />
            Build failed
          </div>
        );
      default:
        return (
          <div
            className={`${base} bg-text-secondary/5 border-text-secondary/15 text-muted-foreground`}
          >
            <div className="w-3 h-3 rounded-full bg-text-secondary/20" />
            No build yet
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          {statusBadge()}
          {projectName && (
            <>
              <Button size="xs" onClick={handleBuildNow} disabled={isBuilding}>
                <Play size={10} />
                Build Now
              </Button>
              <button
                onClick={handleOpenConfig}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-card-hover/50 rounded transition-colors cursor-pointer"
                title={l.configure}
              >
                <Settings size={14} />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReload}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card-hover/50 rounded transition-colors cursor-pointer"
            title={l.reload}
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={handleOpenNewTab}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card-hover/50 rounded transition-colors cursor-pointer"
            title={l.openTab}
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* Build log panel */}
      {logOpen && buildLogs.length > 0 && (
        <div className="flex-shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-3 py-1 bg-muted/80">
            <span className="text-xs font-mono text-muted-foreground font-semibold uppercase tracking-wider">
              Build Log
            </span>
            <button
              onClick={() => setLogOpen(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
          <pre className="max-h-40 overflow-y-auto bg-muted/40 p-3 text-[11px] font-mono text-muted-foreground leading-relaxed">
            {buildLogs.map((line, i) => (
              <div
                key={i}
                className={
                  line.startsWith("$ ")
                    ? "text-primary/80"
                    : line.startsWith("Build")
                      ? "text-foreground"
                      : ""
                }
              >
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </pre>
        </div>
      )}

      {/* Error banner */}
      {previewState?.status === "error" && previewState?.error && !logOpen && (
        <div className="px-3 py-1.5 bg-destructive/10 border-b border-error/20 text-destructive text-xs font-mono leading-relaxed flex-shrink-0 max-h-16 overflow-y-auto">
          {previewState.error}
        </div>
      )}

      {/* Iframe container */}
      <div className="flex-1 flex items-start justify-center overflow-auto bg-muted p-2 sm:p-4 min-h-0">
        {!projectName ||
        (previewState?.status === "idle" && !previewState?.distExists && buildLogs.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Folder size={48} className="opacity-30" />
            <p className="text-sm font-medium">
              {!projectName ? "Select a project to preview" : "No build output yet"}
            </p>
            <p className="text-xs text-center max-w-xs">
              {projectName
                ? "Configure your build settings and click Build Now."
                : "Select a project from the Projects page."}
            </p>
            {projectName && (
              <div className="flex gap-2 mt-1">
                <Button variant="outline" size="xs" onClick={handleOpenConfig}>
                  Configure
                </Button>
                <Button size="xs" onClick={handleBuildNow}>
                  <Play size={10} />
                  Build Now
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden w-full h-full max-w-full">
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={previewSrc || undefined}
              className="w-full h-full border-0"
              title="Project Preview"
            />
          </div>
        )}
      </div>

      {/* Config drawer */}
      {configOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setConfigOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-80 sm:w-96 bg-card border-l border-input z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-input">
              <span className="text-sm font-semibold text-foreground">Preview Settings</span>
              <button
                onClick={() => setConfigOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Framework
                </label>
                <Dropdown<string>
                  value={configForm.framework}
                  onChange={(fw) => {
                    const presets: Record<string, { cmd: string; dir: string }> = {
                      vite: { cmd: "npx --yes vite build", dir: "dist" },
                      next: { cmd: "npx --yes next build", dir: ".next" },
                      nuxt: { cmd: "npx --yes nuxt build", dir: ".output" },
                      astro: { cmd: "npx --yes astro build", dir: "dist" },
                      html: { cmd: "", dir: "." },
                      custom: {
                        cmd: configForm.buildCommand || "npm run build",
                        dir: configForm.outputDir || "dist",
                      },
                    };
                    const preset = presets[fw];
                    if (preset && fw !== "custom" && fw !== "auto") {
                      setConfigForm({
                        framework: fw,
                        buildCommand: preset.cmd,
                        outputDir: preset.dir,
                      });
                    } else {
                      setConfigForm((prev) => ({ ...prev, framework: fw }));
                    }
                  }}
                  options={Object.entries(FRAMEWORK_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  matchWidth
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Build Command
                </label>
                <input
                  type="text"
                  value={configForm.buildCommand}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      buildCommand: e.target.value,
                    }))
                  }
                  placeholder={
                    configForm.framework === "html" ? "No build needed" : "e.g. npm run build"
                  }
                  disabled={configForm.framework === "html"}
                  className="w-full bg-background border border-input hover:border-primary/40 focus:border-primary outline-none text-foreground px-2.5 py-1.5 rounded text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Shell command to build the project (runs in the repo root)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Output Directory
                </label>
                <input
                  type="text"
                  value={configForm.outputDir}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      outputDir: e.target.value,
                    }))
                  }
                  placeholder="dist"
                  className="w-full bg-background border border-input hover:border-primary/40 focus:border-primary outline-none text-foreground px-2.5 py-1.5 rounded text-xs transition-all font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Relative path to the build output directory
                </p>
              </div>
            </div>

            <div className="border-t border-input p-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfigOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveConfig} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
