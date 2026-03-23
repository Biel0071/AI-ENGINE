import { Home, LayoutGrid, Settings, Users } from 'lucide-react';

const items = [
  { label: 'Dashboard', icon: Home },
  { label: 'Modules', icon: LayoutGrid },
  { label: 'Customers', icon: Users },
  { label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="w-72 border-r border-slate-200 bg-white/80 p-5 backdrop-blur">
      <h1 className="mb-8 text-lg font-semibold tracking-tight">Safe Mode Smoke Console</h1>
      <nav className="space-y-2">
        {items.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}