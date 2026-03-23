import { PropsWithChildren } from 'react';

export function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-[260px,1fr]">
      <aside className="rounded-2xl border border-slate-800 bg-panel/85 p-6">
        <h1 className="font-sans text-2xl font-bold tracking-tight">AI Campaign Hub</h1>
        <p className="mt-2 text-sm text-slate-400">Production-ready campaign generation.</p>
        <nav className="mt-8 space-y-2 text-sm">
          <button className="w-full rounded-xl bg-panelSoft px-3 py-2 text-left">Campaigns</button>
          <button className="w-full rounded-xl px-3 py-2 text-left text-slate-400 hover:bg-panelSoft">Contacts</button>
          <button className="w-full rounded-xl px-3 py-2 text-left text-slate-400 hover:bg-panelSoft">Settings</button>
        </nav>
      </aside>
      <main className="rounded-2xl border border-slate-800 bg-slate-950/75 p-6">
        <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">WhatsApp Campaign System</h2>
            <p className="text-xs text-slate-400">Generate frontend for feature: campaign_system
Views/components: campaign_list(DataTable, StatusBadge, ActionButton); campaign_builder(FormCard, TextInput, TextareaInput); preview_panel(PreviewCard, DeviceMock); history_panel(TimelineList, StatusBadge)
Business constraints reflected in UI: A campaign cannot be created without a non-empty message body.; Campaign name must have at least 3 characters.; Contacts must use E.164 compatible phone format.; Only campaigns in draft or paused status can be sent.
Use React + TypeScript + TailwindCSS with dark mode and modern SaaS style.
Include layout with sidebar + topbar, loading states, empty states and reusable UI components.</p>
          </div>
          <span className="rounded-full border border-lime/50 bg-lime/10 px-3 py-1 text-xs text-lime">Engine Ready</span>
        </header>
        {children}
      </main>
    </div>
  );
}