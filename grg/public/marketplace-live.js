(() => {
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const catalog = document.getElementById('marketplaceCatalog');
  const status = document.getElementById('marketplaceStatus');
  if (!catalog || !status) return;

  async function getJson(path) {
    const token = localStorage.getItem('grg_token');
    const response = await fetch(path, { credentials: 'same-origin', headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  }

  window.loadMarketplaceView = async function loadMarketplaceView() {
    status.textContent = 'Consultando skills e conectores do runtime…';
    catalog.innerHTML = '';
    const results = await Promise.allSettled([getJson('/api/skills'), getJson('/api/connectors')]);
    const skills = results[0].status === 'fulfilled' ? results[0].value.skills || [] : [];
    const connectors = results[1].status === 'fulfilled' ? results[1].value.connectors || [] : [];
    const items = [
      ...skills.map(item => ({ kind: 'Skill', name: item.name || item.id, detail: item.description || item.summary || 'Sem descrição', state: item.status || 'REGISTRADA' })),
      ...connectors.map(item => ({ kind: 'Conector', name: item.name || item.id, detail: item.description || item.endpoint || 'Sem descrição', state: item.status || 'REGISTRADO' }))
    ].filter(item => item.name);
    catalog.innerHTML = items.map(item => `<article class="workspace-card fenix-marketplace-card"><small>${esc(item.kind)}</small><h2>${esc(item.name)}</h2><p>${esc(item.detail)}</p><span>${esc(item.state)}</span></article>`).join('');
    const failures = results.filter(result => result.status === 'rejected').map(result => result.reason.message);
    status.textContent = failures.length ? `Catálogo parcial: ${failures.join(' · ')}` : items.length ? `${items.length} capacidades registradas` : 'Nenhuma capacidade registrada neste runtime.';
  };
  document.getElementById('marketplaceRefreshBtn')?.addEventListener('click', window.loadMarketplaceView);
})();
