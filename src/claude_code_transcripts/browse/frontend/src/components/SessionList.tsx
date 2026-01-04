import { KeyboardEvent, useState } from 'react';
import type { Session } from '../types';

interface SessionListProps {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (session: Session) => void;
  loading: boolean;
  onDelete?: (sessionId: string) => void;
  onToggleFavorite?: (sessionId: string) => void;
}

type GroupMode = 'none' | 'folder' | 'date';

/**
 * SessionList component - displays list of sessions with keyboard navigation
 */
export function SessionList({ sessions, selectedId, onSelect, loading, onDelete, onToggleFavorite }: SessionListProps) {
  const [groupMode, setGroupMode] = useState<GroupMode>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Helper to get all group keys
  const getAllGroupKeys = (): string[] => {
    let grouped: Record<string, Session[]> = {};
    if (groupMode === 'folder') {
      grouped = groupByFolder(sessions);
    } else if (groupMode === 'date') {
      grouped = groupByDate(sessions);
    }
    return Object.keys(grouped);
  };

  // Initialize collapsed groups synchronously when group mode changes
  const changeGroupMode = (newMode: GroupMode) => {
    if (newMode === 'none') {
      setCollapsedGroups(new Set());
    } else {
      // Calculate collapsed groups before updating mode
      let grouped: Record<string, Session[]> = {};
      if (newMode === 'folder') {
        grouped = groupByFolder(sessions);
      } else if (newMode === 'date') {
        grouped = groupByDate(sessions);
      }
      // Set collapsed groups first, then update mode
      setCollapsedGroups(new Set(Object.keys(grouped)));
    }
    setGroupMode(newMode);
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const toggleAllGroups = () => {
    setCollapsedGroups(prev => {
      // If currently any groups are collapsed, expand all
      if (prev.size > 0) {
        return new Set();
      } else {
        // Collapse all
        return new Set(getAllGroupKeys());
      }
    });
  };

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

  // Get folder name from file path
  const getFolderName = (filePath: string): string => {
    const parts = filePath.split('/');
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return 'Root';
  };

  // Get date group key from mtime
  const getDateGroup = (mtime: number): string => {
    const date = new Date(mtime * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return 'This Week';
    if (diffDays < 30) return 'This Month';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Group sessions by folder
  const groupByFolder = (sessions: Session[]): Record<string, Session[]> => {
    const groups: Record<string, Session[]> = {};
    sessions.forEach(session => {
      const folder = getFolderName(session.filePath);
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(session);
    });
    return groups;
  };

  // Group sessions by date
  const groupByDate = (sessions: Session[]): Record<string, Session[]> => {
    const groups: Record<string, Session[]> = {};
    // Sort by mtime descending first
    const sorted = [...sessions].sort((a, b) => b.mtime - a.mtime);
    sorted.forEach(session => {
      const dateGroup = getDateGroup(session.mtime);
      if (!groups[dateGroup]) groups[dateGroup] = [];
      groups[dateGroup].push(session);
    });
    return groups;
  };

  // Render a single session item
  const renderSessionItem = (session: Session) => (
    <div
      key={session.id}
      className={`p-3 mb-2 rounded-lg transition-colors ${
        session.id === selectedId
          ? 'bg-blue-100 border-l-4 border-blue-500'
          : 'hover:bg-gray-100'
      }`}
    >
      <div
        className="cursor-pointer"
        onClick={() => onSelect(session)}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">
            {formatDate(session.mtime)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">
              {formatSize(session.size)}
            </span>
            {/* Favorite button */}
            {onToggleFavorite && (
              <button
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(session.id);
                }}
                title={session.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {session.isFavorite ? (
                  <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
              </button>
            )}
            {/* Delete button */}
            {onDelete && (
              <button
                className="p-1 hover:bg-red-100 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete session "${session.summary}"?`)) {
                    onDelete(session.id);
                  }
                }}
                title="Delete session"
              >
                <svg className="w-4 h-4 text-gray-400 hover:text-red-500 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="text-sm font-medium text-gray-800 truncate">
          {session.summary}
        </div>
        <div className="text-xs text-gray-400 truncate">
          {session.project}
        </div>
      </div>
    </div>
  );

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

  // Render grouped sessions
  const renderGroupedSessions = () => {
    let grouped: Record<string, Session[]> = {};
    let groupKeys: string[] = [];

    if (groupMode === 'folder') {
      grouped = groupByFolder(sessions);
      groupKeys = Object.keys(grouped).sort();
    } else if (groupMode === 'date') {
      grouped = groupByDate(sessions);
      groupKeys = Object.keys(grouped);
    }

    if (groupMode === 'none') {
      return sessions.map(session => renderSessionItem(session));
    }

    return groupKeys.map(groupKey => {
      const isCollapsed = collapsedGroups.has(groupKey);
      return (
        <div key={groupKey} className="mb-4">
          <div
            className="px-2 py-1 bg-gray-100 text-xs font-semibold text-gray-600 sticky top-0 cursor-pointer hover:bg-gray-200 transition-colors flex items-center gap-1"
            onClick={() => toggleGroup(groupKey)}
          >
            <span className="transform transition-transform" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
            <span>{groupKey} ({grouped[groupKey].length})</span>
          </div>
          {!isCollapsed && (
            <div className="p-2">
              {grouped[groupKey].map(session => renderSessionItem(session))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className="h-full flex flex-col"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Group mode selector */}
      <div className="px-2 py-2 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Group by:</span>
          <div className="flex gap-1">
            <button
              className={`px-2 py-1 text-xs rounded transition-colors ${
                groupMode === 'none'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => changeGroupMode('none')}
            >
              None
            </button>
            <button
              className={`px-2 py-1 text-xs rounded transition-colors ${
                groupMode === 'folder'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => changeGroupMode('folder')}
            >
              Folder
            </button>
            <button
              className={`px-2 py-1 text-xs rounded transition-colors ${
                groupMode === 'date'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => changeGroupMode('date')}
            >
              Date
            </button>
          </div>
        </div>
        {groupMode !== 'none' && (
          <button
            className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            onClick={toggleAllGroups}
          >
            {collapsedGroups.size > 0 ? 'Expand All' : 'Collapse All'}
          </button>
        )}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {renderGroupedSessions()}
      </div>
    </div>
  );
}
