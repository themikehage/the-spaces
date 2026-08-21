// SPDX-License-Identifier: MIT
import { RichMarkdown } from "@/components/chat/RichMarkdown";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ErrorState } from "@/components/ui/ErrorState";
import { HeaderWithActions } from "@/components/ui/HeaderWithActions";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/contexts/ToastContext";
import { useLiterals } from "@/lib";
import { skillsService } from "@/lib/api/skills.service";
import { EntityEventBus } from "@/lib/event-bus";
import { BookOpen, Check, ChevronLeft, Copy, RefreshCw } from "lucide-react";
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
  const [copiedSkill, setCopiedSkill] = useState(false);

  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const executeReset = useCallback(async () => {
    setShowResetConfirm(false);
    setResetting(true);
    try {
      await skillsService.resetSkills();
      EntityEventBus.emit({ type: "skill" });
      addToast("success", l.resetSuccess);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast("error", l.resetErrorPrefix + msg);
    } finally {
      setResetting(false);
    }
  }, [addToast, l.resetSuccess, l.resetErrorPrefix]);

  const handleResetSkills = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const handleCopySkill = useCallback(async () => {
    if (!selectedSkill) return;
    const text = selectedSkill.content || selectedSkill.description || "";
    if (!text) {
      addToast("error", l.copyError);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSkill(true);
      addToast("success", l.copySuccess);
      setTimeout(() => setCopiedSkill(false), 2000);
    } catch {
      addToast("error", l.copyError);
    }
  }, [selectedSkill, addToast, l.copySuccess, l.copyError]);

  const fetchSkills = useCallback(async () => {
    try {
      const fetched = await skillsService.fetchSkills();
      const sorted = (fetched as unknown as SkillInfo[]).sort((a: SkillInfo, b: SkillInfo) =>
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
  }, [l.loadError]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    return EntityEventBus.subscribe((detail) => {
      if (detail?.type === "skill" || detail?.type === "all" || !detail?.type) {
        fetchSkills();
      }
    });
  }, [fetchSkills]);

  const filteredSkills = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      <HeaderWithActions
        title="Skills & Instructions"
        subtitle="Agent capabilities, instruction files, and tool definitions"
        icon={BookOpen}
        count={skills.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={l.searchPlaceholder}
        onRefresh={fetchSkills}
        isRefreshing={loading}
        secondaryActions={[
          {
            label: "Reset Skills",
            icon: RefreshCw,
            onClick: handleResetSkills,
            loading: resetting,
            title: l.resetTooltip,
          },
        ]}
      />

      {error ? (
        <ErrorState title={l.errorTitle} error={error} onRetry={fetchSkills} />
      ) : loading ? (
        <LoadingState size="lg" />
      ) : (
        <div className="flex-1 flex min-h-0">
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col flex-shrink-0 bg-background ${
              mobileShowDetails ? "hidden md:flex" : "flex"
            }`}
          >
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
                    <Badge variant={s.scope === "project" ? "primary" : "secondary"} size="xs">
                      {s.scope === "project" ? l.scopeProject : l.scopeUser}
                    </Badge>
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
            className={`flex-1 overflow-y-auto bg-card/10 flex flex-col min-w-0 ${
              !mobileShowDetails ? "hidden md:flex" : "flex"
            }`}
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
                    <button
                      type="button"
                      onClick={handleCopySkill}
                      title={l.copyInstructions}
                      className="p-2 rounded-lg border border-input/40 text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors cursor-pointer"
                    >
                      {copiedSkill ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                    <Badge variant={selectedSkill.scope === "project" ? "primary" : "secondary"}>
                      {selectedSkill.scope === "project" ? l.scopeProjectDetail : l.scopeUserDetail}
                    </Badge>
                    {selectedSkill.disableModelInvocation && (
                      <Badge variant="warning">{l.explicitOnly}</Badge>
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
