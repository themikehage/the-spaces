import React from "react";
import type { UseSessionsResult } from "@/hooks/useSessions";

interface SessionListProps {
  sessionManager: UseSessionsResult;
}

export const SessionList: React.FC<SessionListProps> = ({ sessionManager }) => {
  const { sessions, selectedId, loading, error, select, create, remove } = sessionManager;

  const handleCreate = async () => {
    try {
      await create();
    } catch {
      // handled by useSessions
    }
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete session?")) {
      try {
        await remove(id);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-900 text-zinc-200">
      {/* Header / New Session button */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sessions</h2>
        <button
          onClick={handleCreate}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
        >
          + New
        </button>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && sessions.length === 0 && (
          <div className="p-2 text-xs text-zinc-500">Loading sessions...</div>
        )}
        {error && <div className="p-2 text-xs text-red-400">{error}</div>}
        {!loading && sessions.length === 0 && (
          <div className="p-2 text-xs text-zinc-500">No active sessions.</div>
        )}

        {sessions.map((s) => {
          const isSelected = s.id === selectedId;
          return (
            <div
              key={s.id}
              onClick={() => select(s.id)}
              className={`group flex items-center justify-between rounded px-3 py-2 text-xs cursor-pointer transition-colors ${
                isSelected
                  ? "bg-blue-600/20 text-blue-400 font-semibold"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <span className="truncate pr-2">{s.name || s.id}</span>
              <button
                onClick={(e) => handleRemove(e, s.id)}
                className="hidden text-zinc-500 hover:text-red-400 group-hover:block"
                title="Delete session"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
