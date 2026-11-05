(() => {
  'use strict';
  const state = document.getElementById('baiConnectionState');
  const capabilities = document.getElementById('baiCapabilities');
  const button = document.getElementById('baiRefreshBtn');
  if (!state || !button || button.dataset.bound === 'true') return;
  button.dataset.bound = 'true';

  async function refresh() {
    state.textContent = 'Consultando a API autenticada do BAI…';
    button.disabled = true;
    try {
      const token = typeof window.fenixGetAuthToken === 'function'
        ? window.fenixGetAuthToken()
        : (localStorage.getItem('grg_token') || localStorage.getItem('fenix_token') || sessionStorage.getItem('grg_token') || '');
      const response = await fetch('/api/v2/browser/instance/status', {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'same-origin', signal: AbortSignal.timeout(7000)
      });
      const data = await response.json();
      if (data.status === 'UNCONFIGURED') {
        state.textContent = `PENDENTE · ${data.message}`;
        capabilities.textContent = 'Nenhuma conexão BAI está configurada neste backend.';
      } else if (data.status === 'CONNECTED') {
        const profileCount = Number(data.profiles?.count) || 0;
        const hostLabel = Number.isFinite(data.hosts?.count) ? `${data.hosts.count} host(s)` : `hosts: ${data.hosts?.status || 'sem permissão'}`;
        const kinds = Object.entries(data.profiles?.kinds || {}).map(([kind, count]) => `${kind}: ${count}`).join(' · ');
        state.textContent = `ONLINE · API BAI autenticada · ${profileCount} perfil(is)${kinds ? ` (${kinds})` : ''} · ${hostLabel}`;
        capabilities.textContent = 'A API atual não expõe estado de instâncias em execução, catálogo de automações, heartbeat do executor ou listagem de jobs. Execução pelo Fênix permanece pendente.';
      } else {
        state.textContent = `INDISPONÍVEL · ${data.status || `HTTP ${response.status}`}`;
        capabilities.textContent = 'O Fênix não recebeu confirmação válida da API BAI.';
      }
    } catch (_) {
      state.textContent = 'INDISPONÍVEL · não foi possível consultar a API BAI.';
      capabilities.textContent = 'Estado real não confirmado; nenhum executor é considerado ativo.';
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener('click', refresh);
  window.addEventListener('fenix:viewchanged', (event) => {
    if (event.detail?.viewId === 'browser') refresh();
  });
  if (location.hash.includes('browser')) refresh();
})();
