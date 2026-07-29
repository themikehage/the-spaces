// SPDX-License-Identifier: MIT
import { AttentionHubPopover } from "@/components/approvals/AttentionHubPopover";
import { Logo } from "@/components/ui/Logo";
import type { ConnectionState } from "@/lib/ws-client";
import { Grid3X3, Menu } from "lucide-react";
import type { ReactNode } from "react";

interface DesktopHeaderProps {
  onHome: () => void;
  onToggleSidebar: () => void;
  onNavigate: (path: string) => void;
  wsState: ConnectionState;
  breadcrumbs: ReactNode;
}

export function DesktopHeader({
  onHome,
  onToggleSidebar,
  onNavigate,
  wsState,
  breadcrumbs,
}: DesktopHeaderProps) {
  return (
    <header className="h-10 sm:h-12 border-b border-border px-2 sm:px-4 flex items-center justify-between flex-shrink-0 bg-card/30">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onHome}
          className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer flex-shrink-0"
          title="Inicio"
        >
          <Logo size={26} className="sm:w-[22px] sm:h-[22px] w-[32px] h-[32px]" />
        </button>
        <button
          onClick={onToggleSidebar}
          className="sm:hidden p-1 text-muted-foreground hover:text-foreground rounded flex-shrink-0"
          title="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        {breadcrumbs}
      </div>
      <div className="flex items-center gap-1.5">
        <AttentionHubPopover onNavigate={onNavigate} />
        <button
          onClick={() => onNavigate("/sessions")}
          className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
          title="Session Board"
        >
          <Grid3X3 size={16} />
        </button>
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            wsState === "connected"
              ? "bg-success"
              : wsState === "connecting"
                ? "bg-warning animate-pulse"
                : "bg-error"
          }`}
          title={`WebSocket: ${wsState}`}
        />
        <span className="text-[10px] text-muted-foreground/60">
          {wsState === "connected" ? "online" : wsState === "connecting" ? "connecting" : "offline"}
        </span>
      </div>
    </header>
  );
}
