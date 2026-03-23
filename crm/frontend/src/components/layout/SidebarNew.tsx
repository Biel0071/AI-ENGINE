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
    <aside
      style={{
        height: '100%',
        background: 'linear-gradient(180deg, #030712 0%, #07101d 100%)',
        border: '1px solid #1e293b',
        borderRadius: 14,
        padding: 14,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '4px 6px' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            background: '#16a34a',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Z
        </div>
        <div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>ZapAI CRM</h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 11 }}>Automacao inteligente</p>
        </div>
      </div>

      <nav style={{ display: 'grid', gap: 14, flex: 1 }}>
        {sections.map((section) => (
          <div key={section.title}>
            <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' }}>{section.title}</p>
            <div style={{ display: 'grid', gap: 6 }}>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    textDecoration: 'none',
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    background: isActive ? 'linear-gradient(90deg, #14532d 0%, #166534 100%)' : 'transparent',
                    border: isActive ? '1px solid #22c55e' : '1px solid transparent',
                    transition: 'all .2s ease',
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div style={{ borderTop: '1px solid #1e293b', paddingTop: 10 }}>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 11 }}>Tema: Black + Green</p>
      </div>
    </aside>
  );
}
