import { useState } from 'react';

export function SafeModeSmokeForm({ onSubmit }: { onSubmit: (payload: { name: string; description: string }) => Promise<void> | void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({ name, description });
      }}
    >
      <div className="space-y-1">
        <label className="text-sm text-slate-600">Name</label>
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-slate-600">Description</label>
        <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white" type="submit">
        Save Safe Mode Smoke
      </button>
    </form>
  );
}