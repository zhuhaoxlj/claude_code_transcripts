import React, { useState, useCallback } from 'react';
import { useSessions, useSession } from './hooks/useSessions';
import { SessionList } from './components/SessionList';
import { SessionPreview } from './components/SessionPreview';
import type { Session } from './types';

/**
 * Main App component - Claude Session Browser
 */
function App() {
  const { sessions, loading: sessionsLoading } = useSessions(100);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const { data: sessionData, loading: sessionLoading, error: sessionError } = useSession(
    selectedSession?.id || null
  );

  // Auto-select first session when loaded
  React.useEffect(() => {
    if (!selectedSession && sessions.length > 0) {
      setSelectedSession(sessions[0]);
    }
  }, [sessions, selectedSession]);

  const handleSelectSession = useCallback((session: Session) => {
    setSelectedSession(session);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">
          Claude Session Browser
        </h1>
        <div className="text-sm text-gray-500">
          {sessions.length} sessions
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Session list */}
        <div className="w-1/3 min-w-[300px] max-w-[450px] border-r border-gray-200 bg-white">
          <SessionList
            sessions={sessions}
            selectedId={selectedSession?.id || null}
            onSelect={handleSelectSession}
            loading={sessionsLoading}
          />
        </div>

        {/* Right panel - Session preview */}
        <div className="flex-1 bg-white">
          <SessionPreview
            sessionData={sessionData}
            loading={sessionLoading}
            error={sessionError}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
