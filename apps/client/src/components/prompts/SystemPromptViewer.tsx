// SPDX-License-Identifier: MIT
import { apiFetch } from "@/lib/api";
import type { PromptPreviewResponse } from "shared";
import { useEffect, useState } from "react";

export interface SystemPromptViewerProps {
  entityType: "global" | "agent" | "project" | "team" | "subagent";
  agentId?: string;
  projectId?: string;
  teamId?: string;
  subagentId?: string;
  title?: string;
}

export function SystemPromptViewer({
  entityType,
  agentId,
  projectId,
  teamId,
  subagentId,
  title,
}: SystemPromptViewerProps) {
  const [showPreviewsSetting, setShowPreviewsSetting] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PromptPreviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"sections" | "full">("sections");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiFetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setShowPreviewsSetting(!!data.showPromptPreviews);
        }
      })
      .catch(() => {
        if (isMounted) setShowPreviewsSetting(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchPreview = async () => {
    if (previewData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/prompts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          agentId,
          projectId,
          teamId,
          subagentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch prompt preview");
      }
      setPreviewData(data);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      fetchPreview();
    }
  };

  const handleCopy = () => {
    if (!previewData?.fullPrompt) return;
    navigator.clipboard.writeText(previewData.fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (showPreviewsSetting !== true) {
    return null;
  }

  return (
    <div className="mt-4 border border-primary/20 bg-primary/5 rounded-xl overflow-hidden shadow-sm">
      <div
        onClick={handleToggle}
        className="px-4 py-3 bg-primary/10 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold text-xs uppercase tracking-wider">
            {title || `System Prompt Inspector (${entityType})`}
          </span>
          {previewData?.estimatedTokens !== undefined && (
            <span className="text-[10px] bg-primary/20 text-primary font-mono px-2 py-0.5 rounded-full font-semibold">
              ~{previewData.estimatedTokens} tokens
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-primary font-semibold">
          <span>{isOpen ? "Ocultar Prompt" : "Ver System Prompt Exacto"}</span>
          <span className="text-sm font-mono">{isOpen ? "▲" : "▼"}</span>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-3 bg-card/60 border-t border-primary/15">
          {loading ? (
            <div className="text-xs text-muted-foreground animate-pulse py-4 text-center">
              Construyendo previsualización del System Prompt...
            </div>
          ) : error ? (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-mono">
              Error al cargar prompt: {error}
            </div>
          ) : previewData ? (
            <div>
              <div className="flex items-center justify-between border-b border-input/20 pb-2 mb-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("sections")}
                    className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                      activeTab === "sections"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background/80 text-muted-foreground hover:text-foreground border border-input/20"
                    }`}
                  >
                    Secciones ({previewData.sections.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("full")}
                    className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                      activeTab === "full"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background/80 text-muted-foreground hover:text-foreground border border-input/20"
                    }`}
                  >
                    Prompt Completo Concatenado
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1 text-xs bg-card hover:bg-card-hover border border-input/30 text-foreground rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? "✓ Copiado" : "📋 Copiar Prompt"}
                </button>
              </div>

              {activeTab === "sections" ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {previewData.sections.map((sec, i) => (
                    <div
                      key={i}
                      className="bg-background/80 rounded-lg p-3 border border-input/20 space-y-1.5"
                    >
                      <div className="text-[11px] font-bold text-primary uppercase tracking-wider font-mono">
                        {sec.title}
                      </div>
                      <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed select-all bg-card/40 p-2.5 rounded-md border border-input/10">
                        {sec.content}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed select-all bg-background/90 p-3 rounded-lg border border-input/30">
                    {previewData.fullPrompt}
                  </pre>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
