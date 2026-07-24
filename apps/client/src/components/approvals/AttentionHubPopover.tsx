// SPDX-License-Identifier: MIT
import { useAttention } from "@/hooks/useAttention";
import { attentionStore } from "@/lib/attention/attention-store";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ExternalLink, HelpCircle, ShieldAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AttentionItem } from "shared";

export type { AttentionItem };

interface Props {
  onNavigate: (path: string) => void;
}

export function AttentionHubPopover({ onNavigate }: Props) {
  const items = useAttention();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const count = items.length;

  const handleItemClick = (item: AttentionItem) => {
    setIsOpen(false);
    const targetPath = item.projectId
      ? `/workspace/projects/${item.projectId}/session/${item.sessionId}`
      : `/session/${item.sessionId}`;
    onNavigate(targetPath);
  };

  const handleResolveApproval = (
    e: React.MouseEvent,
    id: string,
    action: "approve" | "deny",
  ) => {
    e.stopPropagation();
    attentionStore.resolveApproval(id, action);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer flex items-center justify-center"
        title="Centro de Atención y Aprobaciones"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pulse shadow-sm">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Centro de Atención</h4>
                {count > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    {count} pendiente{count > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
              {items.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No hay preguntas ni aprobaciones pendientes.
                </div>
              ) : (
                items.map((item) => {
                  const isQuestion = item.toolName === "ask_question" || item.type === "question";
                  return (
                    <div
                      key={item.approvalId}
                      onClick={() => handleItemClick(item)}
                      className="p-3.5 hover:bg-accent/40 transition-colors cursor-pointer flex flex-col gap-2 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {isQuestion ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">
                              <HelpCircle className="w-3 h-3" /> Pregunta
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                              <ShieldAlert className="w-3 h-3" /> Aprobación
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                          Ir a sesión <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>

                      <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
                        {item.reason ||
                          (item.args.question as string) ||
                          (item.args.title as string) ||
                          item.toolName}
                      </p>

                      {!isQuestion && (
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <button
                            onClick={(e) => handleResolveApproval(e, item.approvalId, "deny")}
                            className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md cursor-pointer transition-colors"
                          >
                            Denegar
                          </button>
                          <button
                            onClick={(e) => handleResolveApproval(e, item.approvalId, "approve")}
                            className="px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md cursor-pointer transition-colors"
                          >
                            Aprobar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
