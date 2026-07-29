// SPDX-License-Identifier: MIT
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Check, Info, X } from "lucide-react";
import { useEffect } from "react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  text: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => onClose(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgClass =
    toast.type === "success"
      ? "bg-success/15 border-success/30 text-success-foreground"
      : toast.type === "error"
        ? "bg-error/15 border-error/30 text-error-foreground"
        : toast.type === "warning"
          ? "bg-warning/15 border-warning/30 text-warning"
          : "bg-card border-input/20 text-foreground";

  const icon =
    toast.type === "success" ? (
      <Check className="w-4 h-4 text-success-foreground" />
    ) : toast.type === "error" ? (
      <AlertCircle className="w-4 h-4 text-error-foreground" />
    ) : toast.type === "warning" ? (
      <AlertTriangle className="w-4 h-4 text-warning" />
    ) : (
      <Info className="w-4 h-4 text-muted-foreground" />
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md ${bgClass}`}
    >
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 text-xs font-semibold leading-normal">{toast.text}</div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}
