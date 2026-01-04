import { useState, useEffect } from 'react';
import type { Session, SessionData } from '../types';

const API_BASE = '/api';

/**
 * Fetch list of sessions
 */
export function useSessions(limit: number = 50) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/sessions?limit=${limit}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [limit]);

  return { sessions, loading, error };
}

/**
 * Fetch single session data
 */
export function useSession(id: string | null) {
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }

    async function fetchSession() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(String(id))}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const jsonData = await res.json();
        setData(jsonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [id]);

  return { data, loading, error };
}

/**
 * Fetch session as rendered HTML
 */
export function useSessionHtml(id: string | null) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setHtml(null);
      return;
    }

    async function fetchHtml() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(String(id))}/html`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const htmlData = await res.text();
        setHtml(htmlData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchHtml();
  }, [id]);

  return { html, loading, error };
}
