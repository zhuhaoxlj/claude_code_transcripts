import { KeyboardEvent } from 'react';
import type { Session } from '../types';

interface SessionListProps {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (session: Session) => void;
  loading: boolean;
}

/**
 * SessionList component - displays list of sessions with keyboard navigation
 */
export function SessionList({ sessions, selectedId, onSelect, loading }: SessionListProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!selectedId || sessions.length === 0) return;

    const currentIndex = sessions.findIndex((s) => s.id === selectedId);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      nextIndex = Math.min(currentIndex + 1, sessions.length - 1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      nextIndex = Math.max(currentIndex - 1, 0);
    }

    if (nextIndex !== currentIndex) {
      onSelect(sessions[nextIndex]);
    }
  };

  const formatDate = (mtime: number): string => {
    const date = new Date(mtime * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Loading sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        No sessions found
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="p-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
              session.id === selectedId
                ? 'bg-blue-100 border-l-4 border-blue-500'
                : 'hover:bg-gray-100'
            }`}
            onClick={() => onSelect(session)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">
                {formatDate(session.mtime)}
              </span>
              <span className="text-xs text-gray-400">
                {formatSize(session.size)}
              </span>
            </div>
            <div className="text-sm font-medium text-gray-800 truncate">
              {session.summary}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {session.project}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
