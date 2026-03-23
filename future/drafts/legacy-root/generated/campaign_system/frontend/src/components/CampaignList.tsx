import { Campaign } from '../services/campaignApi';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';

interface CampaignListProps {
  campaigns: Campaign[];
  loading: boolean;
  onSend: (campaignId: string) => Promise<void>;
}

export function CampaignList({ campaigns, loading, onSend }: CampaignListProps) {
  return (
    <Card title="Campaign List" subtitle="Review status and trigger message dispatch">
      {loading ? (
        <p className="text-sm text-slate-400">Refreshing campaigns...</p>
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Create your first campaign to start dispatching messages."
        />
      ) : (
        <ul className="space-y-3">
          {campaigns.map((campaign) => (
            <li
              key={campaign.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{campaign.name}</p>
                <p className="text-xs text-slate-400">Status: {campaign.status}</p>
              </div>
              <Button variant="secondary" onClick={() => onSend(campaign.id)}>
                Send Messages
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}