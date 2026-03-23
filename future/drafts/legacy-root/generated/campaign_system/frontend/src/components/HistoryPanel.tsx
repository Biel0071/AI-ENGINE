import { Campaign } from '../services/campaignApi';
import { Card } from './ui/Card';

interface HistoryPanelProps {
  campaigns: Campaign[];
}

export function HistoryPanel({ campaigns }: HistoryPanelProps) {
  return (
    <Card title="History" subtitle="Recent campaign operations">
      <ul className="space-y-2 text-sm">
        {campaigns.map((campaign) => (
          <li key={campaign.id} className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2">
            <span>{campaign.name}</span>
            <span className="text-slate-400">{new Date(campaign.createdAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}