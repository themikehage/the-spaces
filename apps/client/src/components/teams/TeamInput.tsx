// SPDX-License-Identifier: MIT
import { useLiterals } from "@/lib";
import { Send } from "lucide-react";
import { useState } from "react";
import { literals as u } from "./TeamInput.literals";

interface Props {
  onSend: (message: string) => Promise<void>;
}

export function TeamInput({ onSend }: Props) {
  const l = useLiterals(u);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || submitting) return;
    setInput("");
    setSubmitting(true);
    try {
      await onSend(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 bg-card border-t border-input flex gap-2 items-center">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        placeholder={l.placeholder}
        disabled={submitting}
        className="flex-1 bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!input.trim() || submitting}
        className="px-4 py-2.5 text-sm font-medium bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
      >
        <span>{l.send}</span>
        <Send size={14} />
      </button>
    </div>
  );
}
