import React from 'react';

export function safeRender(Component: any, props = {}) {
  try {
    return <Component {...props} />;
  } catch (err) {
    console.error('Erro ao renderizar:', err);

    return (
      <div style={{ padding: 20, color: 'red' }}>
        <h2>Tela com erro</h2>
        <pre>{String(err)}</pre>
      </div>
    );
  }
}
