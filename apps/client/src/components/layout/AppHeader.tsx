// SPDX-License-Identifier: MIT
import { SessionPopover } from "@/components/sidebar/SessionPopover";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Circle, MessageSquare, Settings } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface Props {
  title?: string;
  onOpenSettings?: () => void;
}

export function AppHeader({ title = "Spaces", onOpenSettings }: Props) {
  const navigate = useNavigate();
  const { connected } = useWebSocket();
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <header className="h-14 border-b border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="font-bold text-lg text-surface-900 dark:text-surface-100 tracking-tight"
        >
          {title}
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-surface-500">
          <Circle
            className={`w-2 h-2 fill-current ${connected ? "text-emerald-500" : "text-amber-500"}`}
          />
          <span>{connected ? "Connected" : "Reconnecting..."}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setPopoverOpen(true)}
          className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors flex items-center gap-1 text-xs"
          title="Sessions"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Sessions</span>
        </button>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2 text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {popoverOpen && (
        <SessionPopover
          isOpen={popoverOpen}
          onClose={() => setPopoverOpen(false)}
          activeSessionId={null}
          activeProjectName={null}
          activeAgent={null}
          onSelectSession={(id) => {
            setPopoverOpen(false);
            navigate(`/session/${id}`);
          }}
          onNewSession={() => {
            setPopoverOpen(false);
            navigate("/");
          }}
        />
      )}
    </header>
  );
}
