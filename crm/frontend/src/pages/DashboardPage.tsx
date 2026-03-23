import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import DashboardView from '../views/DashboardView';

interface AnalyticsSummary {
  metrics: { messages: number; leads: number; sessions: number };
  responseRate: number;
  resolvedConversations: number;
  charts: { daily: Array<{ date: string; messages: number; leads: number }> };
}

const useDashboardNewUI = true;

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.get<AnalyticsSummary>('/api/analytics').then(setSummary).finally(() => setLoading(false));
  }, []);

  if (useDashboardNewUI) {
    return <DashboardView loading={loading} summary={summary} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      {loading ? <p className="text-sm text-slate-400">Carregando metricas...</p> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Mensagens" subtitle="Total">
          <p className="text-2xl font-bold">{summary?.metrics?.messages ?? 0}</p>
        </Card>
        <Card title="Leads" subtitle="Contatos ativos">
          <p className="text-2xl font-bold">{summary?.metrics?.leads ?? 0}</p>
        </Card>
        <Card title="Sessoes" subtitle="WhatsApp conectadas">
          <p className="text-2xl font-bold">{summary?.metrics?.sessions ?? 0}</p>
        </Card>
        <Card title="Response Rate" subtitle="Aproveitamento">
          <p className="text-2xl font-bold">{summary?.responseRate ?? 0}%</p>
        </Card>
      </div>
      <Card title="Tendencia semanal" subtitle="Mensagens e leads por dia">
        <div className="space-y-2 text-sm">
          {summary?.charts?.daily?.map((item) => (
            <div key={item.date} className="flex items-center justify-between rounded-lg bg-panelSoft px-3 py-2">
              <span>{item.date}</span>
              <span>Msgs {item.messages} | Leads {item.leads}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
