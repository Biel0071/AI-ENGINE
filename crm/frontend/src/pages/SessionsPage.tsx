import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SessionStatus } from '../types';
import ConnectionsView from '../views/ConnectionsView';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  async function load() {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await api.get<SessionStatus[]>('/sessions');
      setSessions(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar sessoes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startSession() {
    setActionMessage('');
    try {
      await api.post('/sessions/start', {});
      setActionMessage('Sessao iniciada com sucesso.');
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao iniciar sessao.');
    }
  }

  async function restart(sessionId: string) {
    setActionMessage('');
    try {
      await api.post(`/sessions/${sessionId}/reconnect`, { force: true });
      setActionMessage('Reconexao solicitada com sucesso.');
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao reconectar sessao.');
    }
  }

  return (
    <div className="space-y-3">
      {errorMessage ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </div>
      ) : null}
      {actionMessage ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {actionMessage}
        </div>
      ) : null}
      <ConnectionsView
        sessions={sessions}
        loading={loading}
        onStartSession={startSession}
        onReconnect={restart}
      />
    </div>
  );
}
