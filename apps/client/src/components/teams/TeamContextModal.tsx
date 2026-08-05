// SPDX-License-Identifier: MIT
import { FormDialog } from "@/components/ui/FormDialog";
import { useLiterals } from "@/lib";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { TeamContextItem } from "shared";
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

  const handleSubmit = async () => {
    setError(null);
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
    <FormDialog
      open
      onClose={onClose}
      title={`Variables de Contexto (${teamName})`}
      description={l.description}
      onSubmit={handleSubmit}
      submitLabel={saving ? l.saving : l.saveContext}
      cancelLabel="Cancelar"
      isSubmitting={saving}
      size="md"
    >
      <div className="space-y-3">
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

        {error && (
          <div className="bg-destructive/10 border border-error/30 text-destructive text-xs px-3 py-2 rounded-lg mt-2">
            {error}
          </div>
        )}
      </div>
    </FormDialog>
  );
}
