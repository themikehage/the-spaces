import type { Session } from "../api/client.ts";

interface Props {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  loading: boolean;
}

export function SessionList({ sessions, activeId, onSelect, onDelete, onNew, loading }: Props) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="btn-new-session" onClick={onNew} id="btn-new-session">
          <span>+</span>
          <span>New session</span>
        </button>
      </div>
      <div className="session-list">
        {loading && <p className="sidebar-empty">Loading...</p>}
        {!loading && sessions.length === 0 && <p className="sidebar-empty">No sessions yet</p>}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`session-item ${session.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(session.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onSelect(session.id)}
            id={`session-${session.id}`}
          >
            <span className="session-item-name">{session.name}</span>
            <button
              className="btn-delete-session"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
              title="Delete session"
              aria-label={`Delete session ${session.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
