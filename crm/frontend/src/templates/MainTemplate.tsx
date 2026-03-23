import { Outlet } from 'react-router-dom';
import { SidebarNew } from '../components/layout/SidebarNew';

export default function MainTemplate() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#04070d', color: '#fff' }}>
      <div
        style={{
          width: 280,
          minWidth: 280,
          padding: 12,
          borderRight: '1px solid #1e293b',
          background: 'linear-gradient(180deg, #020617 0%, #07101d 100%)',
          boxSizing: 'border-box',
        }}
      >
        <SidebarNew />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            height: 60,
            background: '#020617',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <strong style={{ fontSize: 14, fontWeight: 700 }}>ZapAI CRM</strong>
            <span
              style={{
                fontSize: 11,
                color: '#bbf7d0',
                background: 'rgba(22, 163, 74, 0.18)',
                border: '1px solid rgba(34, 197, 94, 0.5)',
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              Lovable Template
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="text"
              placeholder="Buscar..."
              style={{
                width: 220,
                height: 34,
                borderRadius: 10,
                border: '1px solid #1f3149',
                background: '#08111f',
                color: '#cbd5e1',
                padding: '0 10px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              style={{
                height: 34,
                borderRadius: 10,
                border: '1px solid rgba(34, 197, 94, 0.6)',
                background: '#16a34a',
                color: '#fff',
                padding: '0 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Nova conversa
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 14, boxSizing: 'border-box' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
