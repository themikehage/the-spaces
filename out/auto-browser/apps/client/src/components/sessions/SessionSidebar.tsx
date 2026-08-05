import { useState } from "react";
import { Plus, Search, Trash2, MessageSquare, Bot } from "lucide-react";
import { Button } from "../ui/Button.tsx";
import { clsx } from "clsx";
import type { Session } from "../../api/client.ts";

interface SessionSidebarProps {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  loading?: boolean;
}

export function SessionSidebar({
  sessions,
  activeId,
  onSelect,
  onDelete,
  onNew,
  loading,
}: SessionSidebarProps) {
  const [search, setSearch] = useState("");

  const filteredSessions = sessions.filter((s) =>
    s.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground w-64 shrink-0">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-sidebar-border flex flex-col gap-2.5">
        <Button onClick={onNew} variant="primary" className="w-full gap-2 justify-center shadow-xs">
          <Plus className="h-4 w-4" />
          <span>New Session</span>
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-sidebar-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Session Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && (
          <div className="p-4 text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
            <Bot className="h-4 w-4 text-primary animate-spin" />
            <span>Loading sessions...</span>
          </div>
        )}

        {!loading && filteredSessions.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {search ? "No matching sessions" : "No active sessions. Create one!"}
          </div>
        )}

        {filteredSessions.map((s) => {
          const isActive = s.id === activeId;
          const dateStr = new Date(s.createdAt).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={clsx(
                "group relative flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs transition-all duration-150",
                isActive
                  ? "bg-primary/15 text-primary border border-primary/30 font-medium"
                  : "hover:bg-surface-hover text-sidebar-foreground",
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MessageSquare
                  className={clsx(
                    "h-3.5 w-3.5 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-mono text-[11px] leading-tight">
                    Session #{s.id.slice(0, 6)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80">{dateStr}</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
                title="Delete session"
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-all duration-150 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
