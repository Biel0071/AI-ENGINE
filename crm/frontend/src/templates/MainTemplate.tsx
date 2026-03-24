import { Outlet } from 'react-router-dom';
import { SidebarNew } from '../components/layout/SidebarNew';

export default function MainTemplate() {
  return (
    <div className="flex min-h-screen bg-[#04070d] text-white">
      <div className="box-border w-[280px] min-w-[280px] border-r border-slate-800 bg-gradient-to-b from-slate-950 to-[#07101d] p-3">
        <SidebarNew />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[60px] items-center justify-between border-b border-slate-800 bg-slate-950 px-4 text-white">
          <div className="flex items-center gap-3">
            <strong className="text-sm font-bold">ZapAI CRM</strong>
            <span className="rounded-full border border-emerald-500/50 bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-200">
              Lovable Template
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="text"
              placeholder="Buscar..."
              className="h-[34px] w-[220px] rounded-[10px] border border-[#1f3149] bg-[#08111f] px-2.5 text-slate-300 outline-none"
            />
            <button
              type="button"
              className="h-[34px] cursor-pointer rounded-[10px] border border-emerald-500/60 bg-emerald-600 px-3 text-xs font-bold text-white"
            >
              Nova conversa
            </button>
          </div>
        </div>

        <div className="box-border flex-1 overflow-auto p-[14px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
