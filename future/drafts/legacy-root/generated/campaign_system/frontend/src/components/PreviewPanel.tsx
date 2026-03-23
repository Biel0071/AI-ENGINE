import { Campaign } from '../services/campaignApi';
import { Card } from './ui/Card';

interface PreviewPanelProps {
  campaign?: Campaign;
}

export function PreviewPanel({ campaign }: PreviewPanelProps) {
  return (
    <Card title="Preview Panel" subtitle="Validate outbound message before send">
      {campaign ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-sm text-slate-300">{campaign.message}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-400">Select a campaign to preview content.</p>
      )}
    </Card>
  );
}