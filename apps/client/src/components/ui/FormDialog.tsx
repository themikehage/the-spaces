// SPDX-License-Identifier: MIT
import { Button } from "@/components/ui/Button";
import { Modal, type ModalSize } from "@/components/ui/Modal";
import { Loader2 } from "lucide-react";
import { useState, type FC, type FormEvent, type ReactNode } from "react";

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => Promise<void> | void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  isDirty?: boolean;
  confirmCloseMessage?: string;
  size?: ModalSize;
  className?: string;
  footerExtra?: ReactNode;
}

export const FormDialog: FC<FormDialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  isDirty = false,
  confirmCloseMessage = "You have unsaved changes. Are you sure you want to exit?",
  size = "md",
  className,
  footerExtra,
}) => {
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const loading = isSubmitting || internalSubmitting;

  const handleClose = () => {
    if (isDirty && !loading) {
      if (window.confirm(confirmCloseMessage)) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setInternalSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setInternalSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} size={size} className={className}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 h-full overflow-hidden">
        <header className="px-5 py-4 border-b border-input flex flex-col gap-1 flex-shrink-0 bg-card">
          <h2 className="font-semibold text-foreground text-base">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </header>

        <div className="p-5 flex-1 overflow-y-auto">{children}</div>

        <footer className="px-5 py-3 border-t border-input bg-card flex items-center justify-between flex-shrink-0">
          <div>{footerExtra}</div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              size="sm"
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={loading} size="sm">
              {loading && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </footer>
      </form>
    </Modal>
  );
};
