import { PropsWithChildren } from 'react';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-ink text-slate-100">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 p-4 lg:grid-cols-[260px,1fr]">
        <Sidebar />
        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}
