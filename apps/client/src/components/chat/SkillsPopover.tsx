import { RichMarkdown } from "@/components/chat/RichMarkdown";
import { Modal } from "@/components/ui/Modal";
import { useEntitySkills, type SkillInfo } from "@/hooks/useEntitySkills";
import { useLiterals } from "@/lib";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { EntityType } from "shared";
import { literals as u } from "./ChatInput.literals";
import { PortalPopover } from "./PortalPopover";

interface SkillsPopoverProps {
  skills?: SkillInfo[];
  activeSkills?: string[];
  loading?: boolean;
  open: boolean;
  onClose: () => void;
  onSelectSkill: (skillName: string) => void;
  onToggleSkill?: (skillName: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  disabled?: boolean;
  entityType?: EntityType;
  entityId?: string;
}

export function SkillsPopover({
  skills: externalSkills,
  activeSkills: externalActiveSkills,
  loading: externalLoading = false,
  open,
  onClose,
  onSelectSkill,
  onToggleSkill: externalToggleSkill,
  triggerRef,
  disabled = false,
  entityType,
  entityId,
}: SkillsPopoverProps) {
  const l = useLiterals(u);
  const [activeTab, setActiveTab] = useState<"all" | "global" | "local">("all");
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewingSkill, setViewingSkill] = useState<SkillInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hook for persistent entity skills if entity context is provided
  const entitySkills = useEntitySkills(entityType || "global", entityId || "");

  const useEntityHook = Boolean(entityType && entityId);

  const installedSkills = useEntityHook ? entitySkills.installedSkills : externalSkills || [];
  const activeSkillsList = useEntityHook ? entitySkills.activeSkills : externalActiveSkills || [];
  const isLoading = useEntityHook ? entitySkills.isLoading : externalLoading;



  const isGlobalSkill = (s: SkillInfo) =>
    s.scope === "user" || s.scope === "global" || s.scope === "temporary";
  const isLocalSkill = (s: SkillInfo) => !isGlobalSkill(s);

  const tabFiltered = installedSkills.filter((s) => {
    if (activeTab === "global") return isGlobalSkill(s);
    if (activeTab === "local") return isLocalSkill(s);
    return true; // "all"
  });

  const filtered = tabFiltered.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase())),
  );

  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleToggleSkillItem = async (skillName: string) => {
    if (useEntityHook) {
      await entitySkills.toggleSkill(skillName);
      window.dispatchEvent(new CustomEvent("entity-updated", { detail: { type: "skill" } }));
    } else if (externalToggleSkill) {
      externalToggleSkill(skillName);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || viewingSkill) return;
      if (filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const s = filtered[selectedIndex];
        if (s) {
          onSelectSkill(s.name);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, viewingSkill, filtered, selectedIndex, onClose, onSelectSkill]);

  return (
    <>
      <PortalPopover triggerRef={triggerRef} open={open} onClose={onClose}>
        <div className="w-80 max-h-96 overflow-hidden bg-[#171717] border border-border rounded-xl shadow-xl flex flex-col">
          {/* Preset Tabs: ALL | GLOBAL | LOCAL */}
          <div className="flex gap-1.5 p-2 border-b border-border bg-[#171717] shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setSelectedIndex(0);
              }}
              disabled={disabled}
              className={`flex-1 text-center py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                activeTab === "all"
                  ? "bg-primary/20 text-primary border border-primary/20"
                  : "bg-[#121212] border border-border/30 hover:bg-[#202020] text-muted-foreground"
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("global");
                setSelectedIndex(0);
              }}
              disabled={disabled}
              className={`flex-1 text-center py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                activeTab === "global"
                  ? "bg-primary/20 text-primary border border-primary/20"
                  : "bg-[#121212] border border-border/30 hover:bg-[#202020] text-muted-foreground"
              }`}
            >
              GLOBAL
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("local");
                setSelectedIndex(0);
              }}
              disabled={disabled}
              className={`flex-1 text-center py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                activeTab === "local"
                  ? "bg-primary/20 text-primary border border-primary/20"
                  : "bg-[#121212] border border-border/30 hover:bg-[#202020] text-muted-foreground"
              }`}
            >
              LOCAL
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-2 border-b border-border bg-[#171717]">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder={l.searchSkills}
              className="w-full px-3 py-1.5 bg-[#121212] border border-border/40 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Skills List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1 max-h-80">
            {isLoading && installedSkills.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                <span>Loading...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground select-none">
                {l.noSkills}
              </div>
            ) : (
              filtered.map((s, idx) => {
                const isFocused = idx === selectedIndex;
                const isActive = activeSkillsList.includes(s.name);
                const isGlobal = isGlobalSkill(s);

                return (
                  <div
                    key={`${s.name}-${s.scope || "default"}`}
                    className={`w-full p-2 rounded-lg transition-colors flex items-center justify-between gap-2.5 text-left border ${
                      isFocused
                        ? "bg-primary/10 border-primary/20"
                        : "bg-[#141414] border-border/20 hover:bg-card-hover"
                    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {/* Left: Skill Details (clicking inserts /{s.name} into prompt) */}
                    <div
                      onClick={() => onSelectSkill(s.name)}
                      className="flex-1 min-w-0 cursor-pointer group"
                      title="Clic para insertar referencia en el mensaje"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-text-primary group-hover:text-primary transition-colors truncate">
                          /{s.name}
                        </span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase ${
                            isGlobal
                              ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                              : "bg-primary/15 text-primary border border-primary/20"
                          }`}
                        >
                          {isGlobal ? "Global" : "Local"}
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 truncate w-full mt-0.5">
                          {s.description}
                        </p>
                      )}
                    </div>

                    {/* Right: Actions (Ver instruction & Aplicar button) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {s.content && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingSkill(s);
                          }}
                          className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded border border-border/40 hover:bg-[#202020] transition-colors cursor-pointer"
                        >
                          Ver
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSkillItem(s.name);
                        }}
                        disabled={disabled}
                        title={isActive ? "Desactivar skill" : "Aplicar / Activar skill"}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                          isActive
                            ? "bg-primary text-primary-foreground border border-primary hover:bg-destructive hover:border-destructive"
                            : "bg-[#121212] border border-border/40 text-muted-foreground/40 hover:text-primary hover:border-primary/50"
                        }`}
                      >
                        <Check size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PortalPopover>

      {/* Skill Detail Modal */}
      <Modal
        open={viewingSkill !== null}
        onClose={() => setViewingSkill(null)}
        title={viewingSkill ? `Skill: ${viewingSkill.name}` : "Skill Detail"}
      >
        {viewingSkill && (
          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Descripción
              </span>
              <p className="text-xs text-foreground bg-bg p-2.5 border border-input/40 rounded-xl mt-1">
                {viewingSkill.description || "No description provided."}
              </p>
            </div>
            {viewingSkill.filePath && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Ruta del archivo
                </span>
                <p className="font-mono text-[10px] text-muted-foreground truncate bg-bg p-2 border border-input/40 rounded-xl mt-1">
                  {viewingSkill.filePath}
                </p>
              </div>
            )}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Instrucciones (SKILL.md)
              </span>
              <div className="bg-bg p-3 border border-input/40 rounded-xl mt-1 text-xs">
                <RichMarkdown content={viewingSkill.content || "*No instruction text*"} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
