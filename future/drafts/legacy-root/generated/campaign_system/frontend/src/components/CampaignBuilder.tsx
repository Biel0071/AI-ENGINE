import { FormEvent, useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface CampaignBuilderProps {
  onCreate: (payload: { name: string; message: string }) => Promise<void>;
  busy: boolean;
}

export function CampaignBuilder({ onCreate, busy }: CampaignBuilderProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onCreate({ name, message });
    setName("");
    setMessage("");
  }

  return (
    <Card title="Campaign Builder" subtitle="Create and validate campaign payload before dispatch">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan"
          placeholder="Campaign name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <textarea
          className="h-28 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan"
          placeholder="Message body"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <Button disabled={busy || !name.trim() || !message.trim()}>
          {busy ? "Saving..." : "Create Campaign"}
        </Button>
      </form>
    </Card>
  );
}