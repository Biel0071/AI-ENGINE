type DailyPoint = {
  date: string;
  messages: number;
  leads: number;
};

type Summary = {
  metrics: { messages: number; leads: number; sessions: number };
  responseRate: number;
  resolvedConversations: number;
  charts: { daily: DailyPoint[] };
};

type DashboardViewProps = {
  loading: boolean;
  summary: Summary | null;
};

function formatMetric(value: number | undefined): string {
  return new Intl.NumberFormat('pt-BR').format(value ?? 0);
}

function maxMessages(points: DailyPoint[]): number {
  return points.reduce((max, item) => Math.max(max, item.messages), 0);
}

export default function DashboardView({ loading, summary }: DashboardViewProps) {
  const points = summary?.charts?.daily || [];
  const max = Math.max(1, maxMessages(points));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl border border-borderSoft bg-panel p-4 shadow-card">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Dashboard</h2>
          <p className="text-sm text-slate-400">Visao geral do seu atendimento</p>
        </div>
        <span className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-semibold text-green-300">
          Runtime monitor
        </span>
      </div>

      {loading ? <p className="text-sm text-slate-400">Carregando metricas...</p> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-borderSoft bg-panel p-4 shadow-card">
          <p className="text-xs text-slate-400">Mensagens Hoje</p>
          <p className="mt-2 text-3xl font-bold text-slate-100">{formatMetric(summary?.metrics?.messages)}</p>
          <p className="mt-1 text-xs text-green-400">+12.5% vs ontem</p>
        </article>

        <article className="rounded-xl border border-borderSoft bg-panel p-4 shadow-card">
          <p className="text-xs text-slate-400">Sessoes Ativas</p>
          <p className="mt-2 text-3xl font-bold text-slate-100">{formatMetric(summary?.metrics?.sessions)}</p>
          <p className="mt-1 text-xs text-green-400">monitoradas</p>
        </article>

        <article className="rounded-xl border border-borderSoft bg-panel p-4 shadow-card">
          <p className="text-xs text-slate-400">Novos Leads</p>
          <p className="mt-2 text-3xl font-bold text-slate-100">{formatMetric(summary?.metrics?.leads)}</p>
          <p className="mt-1 text-xs text-green-400">+23.1% vs ontem</p>
        </article>

        <article className="rounded-xl border border-borderSoft bg-panel p-4 shadow-card">
          <p className="text-xs text-slate-400">Respostas IA</p>
          <p className="mt-2 text-3xl font-bold text-slate-100">{formatMetric(summary?.resolvedConversations)}</p>
          <p className="mt-1 text-xs text-green-400">Rate: {summary?.responseRate ?? 0}%</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <section className="rounded-xl border border-borderSoft bg-panel p-4 shadow-card">
          <h3 className="mb-4 text-base font-semibold text-slate-100">Volume de Mensagens</h3>
          <div className="space-y-3">
            {points.length === 0 ? (
              <p className="text-sm text-slate-400">Sem dados para o periodo.</p>
            ) : (
              points.map((item) => {
                const width = Math.max(4, Math.round((item.messages / max) * 100));
                return (
                  <div key={item.date}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                      <span>{item.date}</span>
                      <span>
                        Msgs {item.messages} | Leads {item.leads}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-panelSoft">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${width}%`, background: 'linear-gradient(90deg, #22c55e, #0ea5e9)' }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-xl border border-borderSoft bg-panel p-4 shadow-card">
          <h3 className="mb-4 text-base font-semibold text-slate-100">System Control</h3>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="rounded-lg border border-borderSoft bg-panelSoft px-3 py-2">Runtime reconnecting...</li>
            <li className="rounded-lg border border-borderSoft bg-panelSoft px-3 py-2">API envelopes ativos</li>
            <li className="rounded-lg border border-borderSoft bg-panelSoft px-3 py-2">Safe mode em execucao</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
