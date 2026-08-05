// SPDX-License-Identifier: MIT
import { toSafeString } from "../../../lib/safe-string";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface Props {
  toolCallId: string;
  args: {
    question: string;
    isMultiSelect?: boolean;
    options: any[];
    placeholder?: string;
    allowCustom?: boolean;
  };
  result: {
    content: Array<{ type: string; text?: string }>;
    details?: {
      status?: string;
      payload?: {
        selectedOptions?: string[];
        customAnswer?: string;
      };
    };
    isError: boolean;
  } | null;
  sessionId: string | null;
  onAnswer?: (
    toolCallId: string,
    answer: { selectedOptions?: string[]; customAnswer?: string },
  ) => void;
}

export function AskQuestionForm({ toolCallId, args, result, onAnswer }: Props) {
  const {
    isMultiSelect = false,
    options: rawOptions = [],
    placeholder: rawPlaceholder = "Escribe tu respuesta aquí...",
    allowCustom = true,
  } = args || {};

  const options = Array.isArray(rawOptions)
    ? rawOptions.map((opt) => toSafeString(opt)).filter(Boolean)
    : [];
  const placeholder = toSafeString(rawPlaceholder);

  const noOptions = options.length === 0;
  const showCustom = allowCustom || noOptions;

  const isResolved = !!result;
  const resolvedPayload = result?.details?.payload;

  const [selected, setSelected] = useState<Set<string>>(
    new Set(resolvedPayload?.selectedOptions || []),
  );
  const [customText, setCustomText] = useState(resolvedPayload?.customAnswer || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isResolved) setSubmitting(false);
  }, [isResolved]);

  const handleOptionToggle = (option: string) => {
    if (isResolved || submitting) return;
    const newSelected = new Set(selected);
    if (isMultiSelect) {
      if (newSelected.has(option)) {
        newSelected.delete(option);
      } else {
        newSelected.add(option);
      }
    } else {
      newSelected.clear();
      newSelected.add(option);
    }
    setSelected(newSelected);
  };

  const handleSubmit = () => {
    if (isResolved || submitting) return;
    if (selected.size === 0 && (!showCustom || !customText.trim())) return;

    setSubmitting(true);
    onAnswer?.(toolCallId, {
      selectedOptions: Array.from(selected),
      customAnswer: customText.trim() || undefined,
    });
  };

  return (
    <div className="font-sans">
      <div className="px-3 pb-2 space-y-1.5">
        {options.length > 0 && (
          <div className="grid grid-cols-1 gap-1">
            {options.map((option, idx) => {
              const isChecked = selected.has(option);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isResolved || submitting}
                  onClick={() => handleOptionToggle(option)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition-all ${
                    isChecked
                      ? "bg-primary/10 text-foreground font-semibold"
                      : "hover:bg-muted/40 text-muted-foreground"
                  } ${isResolved ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span className="break-words mr-2">{option}</span>
                  <div
                    className={`w-3.5 h-3.5 shrink-0 flex items-center justify-center transition-all ${
                      isMultiSelect ? "rounded-[2px]" : "rounded-full"
                    } ${isChecked ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {isChecked && <Check className="w-2 h-2" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {showCustom && !isResolved && (
          <textarea
            disabled={submitting}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="w-full rounded-md border border-input bg-background/60 px-2.5 py-1.5 text-xs text-foreground placeholder-muted-foreground/60 leading-relaxed outline-none focus:border-primary transition-colors font-sans resize-none"
          />
        )}

        {isResolved && showCustom && customText && (
          <div className="text-xs text-muted-foreground leading-relaxed select-all bg-muted/20 rounded-md px-2.5 py-1.5">
            {customText}
          </div>
        )}
      </div>

      {!isResolved && (
        <div className="flex items-center justify-end gap-1.5 px-3 pb-2">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-2.5 py-1 rounded bg-primary hover:opacity-90 text-[11px] font-bold text-primary-foreground transition-opacity cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar"}
          </button>
        </div>
      )}
    </div>
  );
}
