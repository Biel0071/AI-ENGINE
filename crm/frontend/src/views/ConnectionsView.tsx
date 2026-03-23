import { SessionStatus } from '../types';

type ConnectionsViewProps = {
  sessions: SessionStatus[];
  loading: boolean;
  onStartSession: () => void;
  onReconnect: (sessionId: string) => void;
};

function statusTag(status: string): 'connected' | 'connecting' | 'disconnected' {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('connect') && !normalized.includes('disconnect')) return 'connected';
  if (normalized.includes('starting') || normalized.includes('connecting') || normalized.includes('qr')) return 'connecting';
  return 'disconnected';
}

export default function ConnectionsView({ sessions, loading, onStartSession, onReconnect }: ConnectionsViewProps) {
  const connected = sessions.filter((item) => statusTag(item.status) === 'connected').length;
  const connecting = sessions.filter((item) => statusTag(item.status) === 'connecting').length;
  const disconnected = sessions.filter((item) => statusTag(item.status) === 'disconnected').length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Conexoes WhatsApp</h2>
        <p className="text-sm text-slate-400">Gerencie suas sessoes de WhatsApp</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-borderSoft bg-panel p-4 shadow-card">
          <p className="text-xs text-slate-400">Conectadas</p>
          <p className="mt-1 text-3xl font-bold text-slate-100">{connected}</p>
        </div>
        <div className="rounded-xl border border-borderSoft bg-panel p-4 shadow-card">
          <p className="text-xs text-slate-400">Conectando</p>
          <p className="mt-1 text-3xl font-bold text-slate-100">{connecting}</p>
        </div>
        <div className="rounded-xl border border-borderSoft bg-panel p-4 shadow-card">
          <p className="text-xs text-slate-400">Desconectadas</p>
          <p className="mt-1 text-3xl font-bold text-slate-100">{disconnected}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onStartSession}
          className="rounded-lg border border-accent/50 bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accentSoft"
        >
          + Activate WhatsApp
        </button>
      </div>

      <section className="rounded-xl border border-borderSoft bg-panel p-4 shadow-card">
        <h3 className="mb-3 text-base font-semibold text-slate-100">Suas Sessoes</h3>

        {loading ? <p className="text-sm text-slate-400">Carregando sessoes...</p> : null}

        {!loading && sessions.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma sessao encontrada.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((item) => (
              <div key={item.sessionId} className="flex items-center justify-between rounded-lg border border-borderSoft bg-panelSoft px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-100">{item.sessionName || item.sessionId}</p>
                  <p className="text-xs text-slate-400">Status: {item.status}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onReconnect(item.sessionId)}
                  className="rounded-lg border border-borderSoft bg-ink px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-accent/50"
                >
                  Reconectar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
