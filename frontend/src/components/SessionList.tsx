import { Session } from '../hooks/useSessionHistory';

interface SessionListProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export default function SessionList({ sessions, activeSessionId, onSelect, onCreate, onDelete }: SessionListProps) {
  return (
    <div className="session-list">
      <div className="session-list-header">
        <span className="session-list-title">セッション履歴</span>
        <button className="session-new-btn" onClick={onCreate}>+ 新規</button>
      </div>
      <div className="session-list-items">
        {sessions.length === 0 ? (
          <div className="session-empty">セッションなし</div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item${session.id === activeSessionId ? ' active' : ''}`}
              onClick={() => onSelect(session.id)}
            >
              <div className="session-item-content">
                <div className="session-item-title">{session.title}</div>
                <div className="session-item-date">{formatDate(session.updatedAt)}</div>
              </div>
              <button
                className="session-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.id);
                }}
                title="削除"
              >
                x
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
