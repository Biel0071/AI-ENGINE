export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-6 py-4 backdrop-blur">
      <div>
        <h2 className="text-xl font-semibold">Cli Smoke Dashboard</h2>
        <p className="text-sm text-slate-500">Generated with reusable AI Engine patterns</p>
      </div>
      <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">
        New Cli Smoke
      </button>
    </header>
  );
}