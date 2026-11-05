(() => {
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  async function getJson(path) {
    const token = localStorage.getItem('grg_token') || sessionStorage.getItem('grg_token');
    const response = await fetch(path, { credentials: 'same-origin', headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  }

  window.loadMarketplaceView = async function loadMarketplaceView() {
    const catalog = document.getElementById('marketplaceCatalog');
    const status = document.getElementById('marketplaceStatus');
    if (!catalog || !status) return;

    status.textContent = 'Consultando skills e conectores do runtime…';
    catalog.innerHTML = '';
    const results = await Promise.allSettled([getJson('/api/skills'), getJson('/api/connectors')]);
    const skills = results[0].status === 'fulfilled' ? results[0].value.skills || [] : [];
    const connectors = results[1].status === 'fulfilled' ? results[1].value.connectors || [] : [];
    const items = [
      ...skills.map(item => ({ kind: 'Skill', name: item.name || item.id, detail: item.description || item.summary || 'Sem descrição', state: item.status || 'REGISTRADA' })),
      ...connectors.map(item => ({ kind: 'Conector', name: item.name || item.id || item.connectorId, detail: item.description || item.endpoint || item.target || 'Sem descrição', state: item.state?.value || item.status || 'REGISTRADO' }))
    ].filter(item => item.name);

    if (items.length > 0) {
      catalog.innerHTML = items.map(item => `<article class="workspace-card fenix-marketplace-card" style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:8px;"><small style="color:#00d9ff; font-weight:700; text-transform:uppercase; font-size:10px;">${esc(item.kind)}</small><h2 style="font-size:14px; margin:0; color:#f8fafc;">${esc(item.name)}</h2><p style="font-size:12px; color:#94a3b8; margin:0; flex:1;">${esc(item.detail)}</p><span style="align-self:flex-start; font-size:10px; padding:3px 8px; border-radius:4px; background:rgba(37,211,102,0.15); color:#25d366; font-weight:700;">${esc(item.state)}</span></article>`).join('');
    } else {
      catalog.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:30px; color:#64748b;">Nenhuma capacidade externa registrada neste runtime.</div>';
    }

    const failures = results.filter(result => result.status === 'rejected').map(result => result.reason.message);
    status.textContent = failures.length ? `Catálogo parcial: ${failures.join(' · ')}` : items.length ? `${items.length} capacidades registradas no runtime` : 'Nenhuma capacidade registrada neste runtime.';
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('marketplaceRefreshBtn')?.addEventListener('click', window.loadMarketplaceView);
  });
  document.getElementById('marketplaceRefreshBtn')?.addEventListener('click', window.loadMarketplaceView);
})();
