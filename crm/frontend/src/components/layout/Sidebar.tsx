import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/inbox', label: 'Inbox' },
  { to: '/campaigns', label: 'Campanhas' },
  { to: '/contacts', label: 'Contatos' },
  { to: '/flows', label: 'Builder de Fluxo' },
  { to: '/quick-replies', label: 'Respostas Rapidas' },
  { to: '/ai-config', label: 'Configuracao IA' },
  { to: '/sessions', label: 'Sessoes' },
];

export function Sidebar() {
  return (
    <aside className="rounded-xl border border-borderSoft bg-panel p-4">
      <h1 className="mb-4 text-lg font-bold text-white">Zapai CRM</h1>
      <nav className="space-y-2">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-accent text-white' : 'text-slate-300 hover:bg-panelSoft'}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
