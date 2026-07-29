// SPDX-License-Identifier: MIT
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type FC, type ReactNode, useCallback, useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal: FC<Props> = ({ open, onClose, title, children, footer }) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, handleEscape]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative bg-card border border-input rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <header className="px-4 py-3 border-b border-input flex items-center justify-between flex-shrink-0 bg-card">
                <span className="font-semibold text-foreground text-sm">{title}</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1"
                >
                  <X size={16} />
                </button>
              </header>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer && (
              <footer className="px-4 py-2.5 border-t border-input bg-card flex justify-end gap-2 flex-shrink-0">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
