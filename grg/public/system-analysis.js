(() => {
  'use strict';
  const dialog = document.getElementById('systemAnalysisDialog');
  const button = document.getElementById('systemAnalysisButton');
  if (!dialog || !button) return;
  const form = document.getElementById('analysisForm'), results = document.getElementById('analysisResults'), error = document.getElementById('analysisError');
  const stages = { inventory: 'Inventariando sistema', code: 'Inspecionando código', captures: 'Capturando telas e registros', tests: 'Executando testes isolados', synthesis: 'Gerando síntese de IA', export: 'Exportando arquivos', done: 'Finalizado' };
  const statuses = { QUEUED: 'Na fila', RUNNING: 'Em andamento', CANCELLING: 'Cancelando', CANCELLED: 'Cancelado — resultados parciais', FAILED: 'Falha', PARTIAL: 'Concluído com limitações', COMPLETED: 'Concluído' };
  const active = r => ['QUEUED', 'RUNNING', 'CANCELLING'].includes(r.status);
  let timer, busy = false;
  const el = (tag, text) => { const n = document.createElement(tag); if (text != null) n.textContent = text; return n; };
  async function request(url, options = {}) {
    const token = localStorage.getItem('grg_token') || localStorage.getItem('fenix_token');
    const response = await fetch(url, { ...options, credentials: 'same-origin', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json', ...options.headers } });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || `Erro HTTP ${response.status}`); }
    return response;
  }
  function action(label, fn) { const b = el('button', label); b.type = 'button'; b.addEventListener('click', async () => { b.disabled = true; try { await fn(); error.textContent = ''; } catch (e) { error.textContent = e.message; } finally { b.disabled = false; } }); return b; }
  async function download(id, artifact) {
    const response = await request(`/api/system-analyses/${id}/artifacts/${artifact.name.split('/').map(encodeURIComponent).join('/')}`);
    const url = URL.createObjectURL(await response.blob()), a = el('a'); a.href = url; a.download = artifact.name.split('/').pop(); a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function render(runs) {
    results.replaceChildren(el('h3', 'Histórico de análises'));
    if (!runs.length) results.append(el('p', 'Nenhuma análise gerada. Escolha o modo e inicie a coleta.'));
    form.querySelector('button[type=submit]').disabled = runs.some(active);
    for (const run of runs) {
      const row = el('article'); row.append(el('strong', `${run.mode === 'deep' ? 'Profundo' : 'Geral'} · ${statuses[run.status] || run.status}`));
      row.append(el('small', `${new Date(run.createdAt).toLocaleString('pt-BR')} · ${stages[run.stage] || run.stage}`));
      if (active(run)) {
        const progress = el('progress'); progress.setAttribute('aria-label', 'Capturas concluídas');
        if (run.progress?.total) { progress.max = run.progress.total; progress.value = run.progress.completed; }
        row.append(progress, el('p', `${run.progress?.completed || 0} de ${run.progress?.total || 0} estados descobertos · ${run.progress?.recordsCaptured || 0}/${run.progress?.recordsTotal || 0} registros capturados. A contagem cresce durante a descoberta.`));
        row.append(action('Cancelar análise', async () => { await request(`/api/system-analyses/${run.id}/cancel`, { method: 'POST', body: '{}' }); await refresh(); }));
      } else if (['FAILED', 'PARTIAL', 'CANCELLED'].includes(run.status)) row.append(action('Retomar / tentar IA novamente', async () => { await request(`/api/system-analyses/${run.id}/retry`, { method: 'POST', body: '{}' }); await refresh(); }));
      if (run.errors?.length) { const details = el('details'); details.append(el('summary', 'Limitações da execução'), el('pre', JSON.stringify(run.errors, null, 2))); row.append(details); }
      const downloads = el('div'); downloads.className = 'analysis-downloads';
      for (const artifact of run.artifacts || []) if (!artifact.name.startsWith('images/')) downloads.append(action(artifact.name, () => download(run.id, artifact)));
      row.append(downloads); results.append(row);
    }
  }
  async function refresh() { if (busy) return; busy = true; try { const data = await (await request('/api/system-analyses')).json(); render(data.analyses); } catch (e) { error.textContent = e.message; } finally { busy = false; } }
  button.addEventListener('click', () => { dialog.showModal(); refresh(); clearInterval(timer); timer = setInterval(refresh, 3000); });
  document.getElementById('analysisClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { clearInterval(timer); button.focus(); });
  form.addEventListener('change', () => { const deep = new FormData(form).get('mode') === 'deep'; const tests = form.elements.tests; tests.disabled = !deep; if (!deep) tests.checked = false; });
  form.addEventListener('submit', async event => {
    event.preventDefault(); const data = new FormData(form), formats = data.getAll('format');
    if (!formats.length) { error.textContent = 'Selecione pelo menos um formato.'; return; }
    const submit = form.querySelector('button[type=submit]'); submit.disabled = true;
    try { await request('/api/system-analyses', { method: 'POST', body: JSON.stringify({ mode: data.get('mode'), formats, tests: data.get('tests') === 'on' }) }); error.textContent = ''; await refresh(); }
    catch (e) { error.textContent = e.message; submit.disabled = false; }
  });
})();
