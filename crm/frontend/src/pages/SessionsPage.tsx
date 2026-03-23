import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SessionStatus } from '../types';
import ConnectionsView from '../views/ConnectionsView';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionStatus[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<SessionStatus[]>('/sessions');
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startSession() {
    await api.post('/sessions/start', {});
    await load();
  }

  async function restart(sessionId: string) {
    await api.post(`/sessions/${sessionId}/reconnect`, { force: true });
    await load();
  }

  return (
    <ConnectionsView
      sessions={sessions}
      loading={loading}
      onStartSession={startSession}
      onReconnect={restart}
    />
  );
}
