// SPDX-License-Identifier: MIT
import { RichMarkdown } from "@/components/chat/RichMarkdown";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/contexts/ToastContext";
import { useLiterals } from "@/lib";
import { apiFetch } from "@/lib/api";
import { BookOpen, ChevronLeft, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { literals as u } from "./SkillsPage.literals";

interface SkillInfo {
  name: string;
  description: string;
  filePath: string;
  disableModelInvocation: boolean;
  scope: "project" | "user" | "temporary";
  content: string;
}

export function SkillsPage() {
  const l = useLiterals(u);
  const { addToast } = useToast();
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<SkillInfo | null>(null);
  const [mobileShowDetails, setMobileShowDetails] = useState(false);

  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const executeReset = useCallback(async () => {
    setShowResetConfirm(false);
    setResetting(true);
    try {
      const res = await apiFetch("/api/skills/reset", {
        method: "POST",
      });
      if (!res.ok) throw new Error(l.loadError);

      window.dispatchEvent(new CustomEvent("entity-updated", { detail: { type: "skill" } }));
      addToast("success", l.resetSuccess);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast("error", l.resetErrorPrefix + msg);
    } finally {
      setResetting(false);
    }
  }, [addToast, l.loadError, l.resetSuccess, l.resetErrorPrefix]);

  const handleResetSkills = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const fetchSkills = useCallback(async () => {
    try {
      const res = await apiFetch("/api/skills");
      if (!res.ok) throw new Error(l.loadError);
      const data = await res.json();
      const sorted = (data.skills ?? []).sort((a: SkillInfo, b: SkillInfo) =>
        a.name.localeCompare(b.name),
      );
      setSkills(sorted);
      if (sorted.length > 0) {
        setSelectedSkill(sorted[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : l.loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type === "skill" || !customEvent.detail?.type) {
        fetchSkills();
      }
    };
    window.addEventListener("entity-updated", handleUpdate);
    return () => window.removeEventListener("entity-updated", handleUpdate);
  }, [fetchSkills]);

  const filteredSkills = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {error ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-4 bg-card border border-input rounded-lg text-center">
            <p className="text-destructive text-sm font-semibold mb-2">{l.errorTitle}</p>
            <p className="text-muted-foreground text-xs mb-4">{error}</p>
            <Button onClick={fetchSkills} size="sm">
              Retry
            </Button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col flex-shrink-0 bg-background ${mobileShowDetails ? "hidden md:flex" : "flex"}`}
          >
            <div className="p-3 border-b border-border flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={l.searchPlaceholder}
                    className="w-full pl-9 pr-3 py-2 bg-card border border-input rounded-lg
                               text-foreground placeholder-text-secondary outline-none
                               focus:border-primary transition-colors text-xs font-sans"
                  />
                </div>
                <button
                  onClick={handleResetSkills}
                  disabled={resetting || loading}
                  title={l.resetTooltip}
                  className="p-2 bg-card hover:bg-card-hover border border-input text-muted-foreground hover:text-primary rounded-lg transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {resetting ? (
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                </button>
              </div>
              <div className="text-xs text-muted-foreground select-none font-medium px-0.5">
                {skills.length} {l.skillCount}
                {skills.length !== 1 ? "s" : ""} loaded
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSkills.map((s, idx) => (
                <button
                  key={`${s.scope}-${s.name}-${idx}`}
                  onClick={() => {
                    setSelectedSkill(s);
                    setMobileShowDetails(true);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-150 cursor-pointer ${
                    selectedSkill?.name === s.name
                      ? "bg-card text-foreground border border-input/80 shadow"
                      : "text-muted-foreground hover:bg-card/50 hover:text-foreground border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-xs truncate max-w-[70%]">
                      {s.name}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                        s.scope === "project"
                          ? "bg-primary/10 text-primary"
                          : "bg-highlight/10 text-highlight"
                      }`}
                    >
                      {s.scope === "project" ? l.scopeProject : l.scopeUser}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
                    {s.description}
                  </p>
                </button>
              ))}
              {filteredSkills.length === 0 && (
                <p className="text-muted-foreground text-xs text-center py-8">{l.noSkillsFound}</p>
              )}
            </div>
          </div>

          <div
            className={`flex-1 overflow-y-auto bg-card/10 flex flex-col min-w-0 ${!mobileShowDetails ? "hidden md:flex" : "flex"}`}
          >
            {selectedSkill ? (
              <div className="p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-4">
                <button
                  onClick={() => setMobileShowDetails(false)}
                  className="md:hidden flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  {l.backToList}
                </button>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h2 className="text-lg font-bold font-display text-foreground">
                      {selectedSkill.name}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono mt-1 break-words">
                      {l.location} {selectedSkill.filePath}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                        selectedSkill.scope === "project"
                          ? "bg-primary/20 text-primary"
                          : "bg-highlight/20 text-highlight"
                      }`}
                    >
                      {selectedSkill.scope === "project" ? l.scopeProjectDetail : l.scopeUserDetail}
                    </span>
                    {selectedSkill.disableModelInvocation && (
                      <span className="text-xs px-2 py-0.5 rounded font-semibold uppercase bg-warning/20 text-warning">
                        {l.explicitOnly}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-widest mb-1.5">
                      Description
                    </h3>
                    <p className="text-sm text-muted-foreground bg-card/40 p-3 rounded-lg border border-input/30 leading-relaxed">
                      {selectedSkill.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-widest mb-2">
                      Instructions
                    </h3>
                    <div className="bg-card/50 p-4 sm:p-5 rounded-lg border border-input/50 shadow-sm">
                      <RichMarkdown content={selectedSkill.content || l.noInstructionText} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <BookOpen size={48} className="text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">{l.selectSkillHint}</p>
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmModal
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={executeReset}
        title={l.resetConfirmTitle ?? "Reset Skills"}
        message={l.resetConfirm}
        confirmLabel={l.resetConfirmButton ?? "Reset"}
        cancelLabel={l.cancel ?? "Cancel"}
        destructive
        loading={resetting}
      />
    </div>
  );
}
