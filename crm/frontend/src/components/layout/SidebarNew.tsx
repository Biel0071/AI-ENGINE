import { NavLink } from 'react-router-dom';

const sections = [
  {
    title: 'Messaging',
    items: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/inbox', label: 'Inbox' },
      { to: '/chat', label: 'Chat' },
      { to: '/connections', label: 'Conexoes' },
      { to: '/contacts', label: 'Contatos' },
    ],
  },
  {
    title: 'Automation',
    items: [
      { to: '/campaigns', label: 'Campanhas' },
      { to: '/flows', label: 'Flows' },
      { to: '/quick-replies', label: 'Quick Replies' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/ai-config', label: 'AI Config' },
      { to: '/sessions', label: 'Sessoes' },
    ],
  },
];

export function SidebarNew() {
  return (
    <aside className="box-border flex h-full flex-col rounded-[14px] border border-slate-800 bg-gradient-to-b from-slate-950 to-[#07101d] p-[14px]">
      <div className="mb-[14px] flex items-center gap-2.5 px-1.5 py-1">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
          Z
        </div>
        <div>
          <h1 className="m-0 text-[15px] font-bold text-white">ZapAI CRM</h1>
          <p className="m-0 text-[11px] text-slate-400">Automacao inteligente</p>
        </div>
      </div>

      <nav className="grid flex-1 gap-[14px]">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 mt-0 text-[10px] uppercase tracking-[0.7px] text-slate-500">{section.title}</p>
            <div className="grid gap-1.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded-[10px] border px-3 py-2.5 text-[13px] no-underline transition-all duration-200',
                      isActive
                        ? 'border-emerald-500 bg-gradient-to-r from-green-900 to-green-800 text-white'
                        : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/50',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 pt-2.5">
        <p className="m-0 text-[11px] text-slate-400">Tema: Black + Green</p>
      </div>
    </aside>
  );
}
