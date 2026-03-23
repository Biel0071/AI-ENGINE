import { useEffect, useMemo, useState } from 'react';
import { CampaignBuilder } from './components/CampaignBuilder';
import { CampaignList } from './components/CampaignList';
import { HistoryPanel } from './components/HistoryPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { EmptyState } from './components/ui/EmptyState';
import { LoadingState } from './components/ui/LoadingState';
import { DashboardLayout } from './layout/DashboardLayout';
import { ApiError } from './services/http/client';
import { Campaign, createCampaign, listCampaigns, sendCampaign } from './services/campaignApi';

export default function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCampaigns() {
    setIsLoading(true);
    try {
      const data = await listCampaigns();
      setCampaigns(data);
      setError(null);
    } catch (caughtError) {
      const apiError = caughtError as ApiError;
      setError(apiError.message || "Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCampaigns();
  }, []);

  async function handleCreate(payload: { name: string; message: string }) {
    setIsSaving(true);
    try {
      await createCampaign(payload);
      await loadCampaigns();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSend(campaignId: string) {
    setIsSaving(true);
    try {
      await sendCampaign(campaignId);
      await loadCampaigns();
    } finally {
      setIsSaving(false);
    }
  }

  const previewCampaign = useMemo(() => campaigns[0], [campaigns]);

  return (
    <DashboardLayout>
      {error && <p className="mb-4 rounded-lg border border-roseSoft/40 bg-roseSoft/10 p-3 text-sm text-rose-200">{error}</p>}
      {isLoading ? (
        <LoadingState label="Loading campaign data..." />
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="Campaign workspace is empty"
          description="Use Campaign Builder to create your first message flow."
        />
      ) : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        <CampaignBuilder onCreate={handleCreate} busy={isSaving} />
        <PreviewPanel campaign={previewCampaign} />
        <CampaignList campaigns={campaigns} loading={isLoading} onSend={handleSend} />
        <HistoryPanel campaigns={campaigns} />
      </div>
    </DashboardLayout>
  );
}