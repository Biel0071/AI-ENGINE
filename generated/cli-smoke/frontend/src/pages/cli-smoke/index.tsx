import { AppSidebar } from '../../components/layout/AppSidebar';
import { AppHeader } from '../../components/layout/AppHeader';
import { UiCard } from '../../components/ui/UiCard';
import { UiDataTable } from '../../components/ui/UiDataTable';
import { CliSmokeForm } from '../../components/forms/cli-smokeForm';

const demoRows = [
  { id: '1', name: 'Cli Smoke A', status: 'active' },
  { id: '2', name: 'Cli Smoke B', status: 'draft' },
];

export default function CliSmokePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1">
          <AppHeader />
          <section className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <UiCard title="Active Cli Smoke" value="12" hint="+14% this week" />
              <UiCard title="Automation Health" value="98%" hint="Stable" />
              <UiCard title="Open Tasks" value="7" hint="Needs review" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <UiDataTable rows={demoRows} />
              <CliSmokeForm onSubmit={async () => undefined} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}