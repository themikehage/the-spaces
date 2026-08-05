// SPDX-License-Identifier: MIT
import { Modal, type ModalSize } from "@/components/ui/Modal";
import type { FC, ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  className?: string;
}

export const Dialog: FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}) => {
  return (
    <Modal open={open} onClose={onClose} size={size} className={className}>
      <header className="px-5 py-4 border-b border-input flex flex-col gap-1 flex-shrink-0 bg-card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-base">{title}</h2>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="p-5 flex-1 overflow-y-auto">{children}</div>
      {footer && (
        <footer className="px-5 py-3 border-t border-input bg-card flex justify-end gap-2 flex-shrink-0">
          {footer}
        </footer>
      )}
    </Modal>
  );
};
