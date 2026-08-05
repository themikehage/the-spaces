// SPDX-License-Identifier: MIT
import { AuthenticatedImage } from "@/components/chat/ImageGrid";
import { Button } from "@/components/ui/Button";
import { useLiterals } from "@/lib";
import { literals as u } from "@/pages/AgentsPage.literals";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

export function BlueprintDetailModal({
  blueprint,
  onClose,
  onInstall,
  isInstalled,
  installing,
}: {
  blueprint: any;
  onClose: () => void;
  onInstall: (id: string) => Promise<void>;
  isInstalled: boolean;
  installing: boolean;
}) {
  const l = useLiterals(u);
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-2xl max-h-[85vh] bg-card border border-input rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-input flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {blueprint.hasIcon ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-input">
                <AuthenticatedImage
                  src={`/api/gallery/blueprints/${blueprint.id}/icon`}
                  alt={blueprint.metadata.title}
                  className="w-8 h-8 object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                {blueprint.metadata.title.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-sm font-semibold text-foreground">{blueprint.metadata.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {blueprint.type === "agent" ? l.filterAgents : l.filterChannels} • {l.version}{" "}
                {blueprint.metadata.version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 text-xs">
          <div className="space-y-1.5">
            <h3 className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              {l.execSubtitle}
            </h3>
            <p className="text-foreground text-sm leading-relaxed">
              {blueprint.metadata.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/50 border border-input rounded-xl p-3 flex flex-col">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">
                {l.author}
              </span>
              <span className="text-foreground font-medium mt-1">{blueprint.metadata.author}</span>
            </div>
            {blueprint.metadata.compatibility && (
              <div className="bg-background/50 border border-input rounded-xl p-3 flex flex-col">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">
                  {l.compatibility}
                </span>
                <span className="text-foreground font-medium mt-1">
                  {blueprint.metadata.compatibility}
                </span>
              </div>
            )}
          </div>

          {blueprint.type === "agent" ? (
            <>
              {blueprint.definition.skills && blueprint.definition.skills.length > 0 && (
                <div>
                  <h3 className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] mb-1.5">
                    {l.skillsTitle}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {blueprint.definition.skills.map((s: string) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg font-medium text-[11px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {blueprint.definition.model && (
                <div>
                  <h3 className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] mb-1">
                    {l.modelTitle}
                  </h3>
                  <span className="font-mono text-foreground bg-background px-2 py-1 rounded border border-input inline-block">
                    {blueprint.definition.model}
                  </span>
                </div>
              )}

              <div className="border border-input rounded-xl overflow-hidden bg-background/30">
                <button
                  type="button"
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-card-hover/40 transition-colors text-left"
                >
                  <span className="font-semibold text-foreground">{l.systemPromptPreview}</span>
                  <ChevronDown
                    size={16}
                    className={`text-muted-foreground transform transition-transform ${showPrompt ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {showPrompt && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-input"
                    >
                      <pre className="p-4 overflow-x-auto text-[11px] leading-relaxed font-mono whitespace-pre-wrap text-foreground bg-background/50 max-h-60 overflow-y-auto">
                        {blueprint.definition.systemPrompt}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              {blueprint.definition.members && blueprint.definition.members.length > 0 && (
                <div>
                  <h3 className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] mb-2">
                    {l.channelMembersTitle}
                  </h3>
                  <div className="space-y-1.5">
                    {blueprint.definition.members.map((m: any) => (
                      <div
                        key={m.agentId}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-input bg-background/50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] border border-primary/20">
                            {m.agentId.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-foreground text-xs">{m.agentId}</span>
                            {m.role && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-card text-muted-foreground text-[9px] rounded-md border border-input uppercase font-bold">
                                {m.role}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {l.replyModeTitle}:{" "}
                          <strong className="text-foreground">{m.replyMode}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {blueprint.definition.context && blueprint.definition.context.length > 0 && (
                <div>
                  <h3 className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] mb-2">
                    Variables de Contexto
                  </h3>
                  <div className="space-y-1">
                    {blueprint.definition.context.map((ctx: any) => (
                      <div
                        key={ctx.key}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-input font-mono text-[10px]"
                      >
                        <span className="text-primary font-semibold">{ctx.key}:</span>
                        <span className="text-muted-foreground">{ctx.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {blueprint.metadata.tags && blueprint.metadata.tags.length > 0 && (
            <div>
              <h3 className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] mb-1.5">
                {l.tagsTitle}
              </h3>
              <div className="flex flex-wrap gap-1">
                {blueprint.metadata.tags.map((t: string) => (
                  <span
                    key={t}
                    className="text-[9px] bg-background/50 border border-input px-2 py-0.5 rounded-md text-muted-foreground font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-5 border-t border-input bg-background/30 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {l.cancel}
          </Button>
          <Button
            disabled={isInstalled || installing}
            onClick={async () => {
              await onInstall(blueprint.id);
              onClose();
            }}
            className="flex-1"
          >
            {installing ? l.installing : isInstalled ? l.installed : l.install}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
