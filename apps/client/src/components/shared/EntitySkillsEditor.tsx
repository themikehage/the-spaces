// SPDX-License-Identifier: MIT
import { RichMarkdown } from "@/components/chat/RichMarkdown";
import { Modal } from "@/components/ui/Modal";
import { useEntitySkills, type SkillInfo } from "@/hooks/useEntitySkills";
import { BookOpen, Check, RefreshCw, Zap } from "lucide-react";
import { useState } from "react";
import type { EntityType } from "shared";

interface Props {
  entityType: EntityType;
  entityId: string;
  title?: string;
}

export function EntitySkillsEditor({ entityType, entityId, title }: Props) {
  const {
    installedSkills,
    activeSkills,
    resolvedSkills,
    isLoading,
    isSaving,
    error,
    toggleSkill,
    refresh,
  } = useEntitySkills(entityType, entityId);

  const [viewingSkill, setViewingSkill] = useState<SkillInfo | null>(null);

  if (!entityId) return null;

  return (
    <div className="space-y-3 bg-bg border border-input rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              {title || "Skills Configuration"}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Enable skills available in this entity's workspace or inherited from global.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-primary/15 text-primary border border-primary/20">
            {activeSkills.length} active
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading || isSaving}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-md hover:bg-surface-hover"
            title="Refresh skills"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2 bg-error/10 border border-error/20 text-error rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Loading entity skills...
        </div>
      ) : installedSkills.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-input rounded-xl bg-card/30">
          <BookOpen className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-foreground">No skills detected</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
            Add custom skills under{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-[10px]">.spaces/skills</code> in this
            workspace.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {installedSkills.map((skill) => {
            const isActiveExplicitly = activeSkills.includes(skill.name);
            const isResolvedActive = resolvedSkills.includes(skill.name);

            return (
              <div
                key={skill.name}
                className={`flex items-start justify-between p-2.5 rounded-xl border transition-all ${
                  isActiveExplicitly
                    ? "bg-primary/5 border-primary/30"
                    : "bg-card/40 hover:bg-card border-input/40"
                }`}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={() => toggleSkill(skill.name)}
                    disabled={isSaving}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                      isActiveExplicitly
                        ? "bg-primary border-primary text-white"
                        : "border-input bg-bg hover:border-primary/50"
                    }`}
                  >
                    {isActiveExplicitly && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground truncate">
                        {skill.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                          skill.scope === entityType
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-input/30"
                        }`}
                      >
                        {skill.scope || "project"}
                      </span>
                      {!isActiveExplicitly && isResolvedActive && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase bg-accent/15 text-accent border border-accent/20">
                          Inherited
                        </span>
                      )}
                    </div>
                    {skill.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-normal">
                        {skill.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingSkill(skill)}
                  className="text-[11px] font-semibold text-primary hover:underline px-1.5 py-1 cursor-pointer flex-shrink-0"
                >
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={viewingSkill !== null}
        onClose={() => setViewingSkill(null)}
        title={viewingSkill ? `Skill: ${viewingSkill.name}` : "Skill Detail"}
      >
        {viewingSkill && (
          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </span>
              <p className="text-xs text-foreground bg-bg p-2.5 border border-input/40 rounded-xl mt-1">
                {viewingSkill.description || "No description provided."}
              </p>
            </div>
            {viewingSkill.filePath && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  File Path
                </span>
                <p className="font-mono text-[10px] text-muted-foreground truncate bg-bg p-2 border border-input/40 rounded-xl mt-1">
                  {viewingSkill.filePath}
                </p>
              </div>
            )}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Instructions (SKILL.md)
              </span>
              <div className="bg-bg p-3 border border-input/40 rounded-xl mt-1 text-xs">
                <RichMarkdown content={viewingSkill.content || "*No instruction text*"} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
