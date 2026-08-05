import { X } from "lucide-react";
import { Button } from "../ui/Button.tsx";
import { SessionSidebar } from "../sessions/SessionSidebar.tsx";
import type { Session } from "../../api/client.ts";

interface MobileSidebarOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  loading?: boolean;
}

export function MobileSidebarOverlay({
  isOpen,
  onClose,
  sessions,
  activeId,
  onSelect,
  onDelete,
  onNew,
  loading,
}: MobileSidebarOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative z-10 w-72 max-w-[80vw] bg-sidebar h-full flex flex-col shadow-2xl animate-card-enter">
        <div className="p-3 border-b border-sidebar-border flex items-center justify-between">
          <span className="font-semibold text-xs text-foreground">Navigation</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close sidebar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <SessionSidebar
            sessions={sessions}
            activeId={activeId}
            onSelect={(id) => {
              onSelect(id);
              onClose();
            }}
            onDelete={onDelete}
            onNew={() => {
              onNew();
              onClose();
            }}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
