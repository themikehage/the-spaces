import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { clsx } from "clsx";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-lg border text-sm animate-card-enter transition-all duration-200",
              {
                "bg-surface border-success/40 text-success": t.type === "success",
                "bg-surface border-error/40 text-error": t.type === "error",
                "bg-surface border-warning/40 text-warning": t.type === "warning",
                "bg-surface border-border text-foreground": t.type === "info",
              },
            )}
          >
            {t.type === "success" && <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            {t.type === "warning" && <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />}

            <span className="flex-1 text-xs leading-relaxed text-foreground">{t.message}</span>

            <button
              onClick={() => removeToast(t.id)}
              className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
