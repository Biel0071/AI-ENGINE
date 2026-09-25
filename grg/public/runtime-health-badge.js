(() => {
  const top = document.querySelector('.v10-status-pill');
  const footer = document.querySelector('.fenix-sidebar-user-status');
  if (!top || !footer) return;
  top.setAttribute('role', 'status'); top.setAttribute('aria-live', 'polite');
  function display(label, state, detail) {
    for (const element of [top, footer]) {
      element.dataset.health = state;
      const text = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE) || element.querySelector('span:last-child');
      if (text) text.textContent = label;
      element.title = detail || label;
    }
  }
  async function refresh() {
    try {
      const response = await fetch('/api/system/boot-status', { credentials: 'same-origin', signal: AbortSignal.timeout(10000), cache: 'no-store' });
      const data = await response.json();
      if (!data.checks || typeof data.ok !== 'boolean') throw new Error(data.error || `HTTP ${response.status}`);
      const failed = Object.entries(data.checks).filter(([, check]) => check?.ok === false);
      const detail = failed.length ? failed.map(([name, check]) => `${name}: ${check.error || check.degraded || 'indisponível'}`).join(' · ') : 'Todos os serviços essenciais responderam.';
      display(data.ok ? (failed.length ? 'Operação parcial' : 'Sistema saudável') : 'Sistema degradado', data.ok ? (failed.length ? 'partial' : 'ready') : 'degraded', detail);
    } catch (error) { display('Status indisponível', 'unknown', error.message); }
  }
  display('Verificando sistema', 'checking');
  refresh();
  setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60000);
})();
