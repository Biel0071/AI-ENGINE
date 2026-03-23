import { AppSidebar } from '../../components/layout/AppSidebar';
import { AppHeader } from '../../components/layout/AppHeader';
import { UiCard } from '../../components/ui/UiCard';
import { UiDataTable } from '../../components/ui/UiDataTable';
import { StructureCheckForm } from '../../components/forms/structure-checkForm';

const demoRows = [
  { id: '1', name: 'Structure Check A', status: 'active' },
  { id: '2', name: 'Structure Check B', status: 'draft' },
];

export default function StructureCheckPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1">
          <AppHeader />
          <section className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <UiCard title="Active Structure Check" value="12" hint="+14% this week" />
              <UiCard title="Automation Health" value="98%" hint="Stable" />
              <UiCard title="Open Tasks" value="7" hint="Needs review" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <UiDataTable rows={demoRows} />
              <StructureCheckForm onSubmit={async () => undefined} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}