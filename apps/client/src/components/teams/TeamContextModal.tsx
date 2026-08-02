// SPDX-License-Identifier: MIT
import { useLiterals } from "@/lib";
import type { TeamContextItem } from "@spaces/core";
import { motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { literals as u } from "./TeamContextModal.literals";

interface Props {
  teamName: string;
  context: TeamContextItem[];
  onClose: () => void;
  onSave: (context: TeamContextItem[]) => Promise<void>;
}

export function TeamContextModal({ teamName, context, onClose, onSave }: Props) {
  const l = useLiterals(u);
  const [items, setItems] = useState<TeamContextItem[]>(() => (context ? [...context] : []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddField = () => {
    setItems((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleChange = (index: number, field: "key" | "value", val: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Filter out empty rows or validate keys
    const filtered = items.filter((it) => it.key.trim() !== "");
    setSaving(true);
    try {
      await onSave(filtered.map((it) => ({ key: it.key.trim(), value: it.value.trim() })));
      onClose();
    } catch (err: any) {
      setError(err.message || l.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-lg bg-card border border-input rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-input flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span>Variables de Contexto</span>
              <span className="text-xs text-primary font-normal">({teamName})</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{l.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs">{l.emptyContext}</div>
            )}

            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={l.keyPlaceholder}
                  value={item.key}
                  onChange={(e) => handleChange(index, "key", e.target.value)}
                  className="w-1/3 bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary/50"
                />
                <input
                  type="text"
                  placeholder={l.valuePlaceholder}
                  value={item.value}
                  onChange={(e) => handleChange(index, "value", e.target.value)}
                  className="flex-1 bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                  title={l.deleteVar}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddField}
              className="w-full py-2 border border-dashed border-input hover:border-primary/40 rounded-lg text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 mt-2"
            >
              <Plus size={12} />
              {l.addVar}
            </button>
          </div>

          {error && (
            <div className="mx-5 mb-2 bg-destructive/10 border border-error/30 text-destructive text-xs px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2 px-5 py-4 border-t border-input flex-shrink-0 bg-card/40">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-medium text-muted-foreground border border-input rounded-lg hover:bg-card-hover transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-xs font-medium bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? l.saving : l.saveContext}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
