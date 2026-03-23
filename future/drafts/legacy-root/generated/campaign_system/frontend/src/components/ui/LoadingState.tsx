export function LoadingState({ label = "Loading data..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-panelSoft/70 p-4">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan/30 border-t-cyan" />
      <p className="text-sm text-slate-300">{label}</p>
    </div>
  );
}