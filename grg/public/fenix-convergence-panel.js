/**
 * FÊNIX — Painel de Convergência (LEVEL 2, 2026-11-11)
 * Inteligência compartilhada, colaboração entre IAs e evolução, com números REAIS de
 * /api/v2/hub/convergence. Cada bloco mostra de onde o número vem. Sem dado: 0, não meta.
 */
(function () {
  'use strict';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function token() { try { return localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || ''; } catch (_) { return ''; } }
  async function load() {
    const t = token();
    const res = await fetch('/api/v2/hub/convergence', { credentials: 'same-origin', headers: t ? { Authorization: 'Bearer ' + t } : {} });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'HTTP ' + res.status);
    return body.convergence;
  }
  const row = (label, value, hint) => `<div class="fenix-conv-row"><span>${esc(label)}</span><strong>${esc(value)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
  function render(c) {
    const by = Object.entries(c.intelligence.byProvider || {}).map(([p, n]) => `${p}: ${n}`).join(' · ') || 'nenhuma ferramenta registrou conhecimento ainda';
    const cost = (c.evolution.costByMission || []).slice(0, 5).map((m) => `<li><code>${esc(m.missionId.slice(0, 8))}</code> · US$ ${esc(m.costUsd)} · ${esc(m.tokens)} tokens</li>`).join('') || '<li>Nenhuma chamada de IA ligada a missão ainda.</li>';
    return `
      <section class="fenix-conv-block"><h4>Inteligência</h4>
        ${row('Conhecimento compartilhado', c.intelligence.knowledge)}
        ${row('Validado com evidência', c.intelligence.validated)}
        ${row('Sugestões ainda não validadas', c.intelligence.unvalidatedSuggestions)}
        ${row('Contribuições do Claude', c.intelligence.claudeContributions)}
        <p class="fenix-conv-by">${esc(by)}</p><p class="fenix-conv-src">Fonte: ${esc(c.intelligence.source)}</p></section>
      <section class="fenix-conv-block"><h4>Colaboração</h4>
        ${row('Conversas entre ferramentas diferentes', c.collaboration.crossToolThreads)}
        ${row('Mensagens trocadas', c.collaboration.messages)}
        ${row('Propostas de melhoria', c.collaboration.proposals)}
        ${row('Missões criadas pelo diretor', c.collaboration.directorMissions)}
        <p class="fenix-conv-src">Fonte: ${esc(c.collaboration.source)}</p></section>
      <section class="fenix-conv-block"><h4>Evolução</h4>
        ${row('Workers ativos agora', c.evolution.workersActive)}
        ${row('Tokens de código gerados pela VPS', c.evolution.vpsCodeTokens)}
        ${row('Missões concluídas', c.evolution.missionsSucceeded)}
        ${row('Custo total de IA (US$)', c.evolution.costUsd)}
        <ul class="fenix-conv-cost">${cost}</ul><p class="fenix-conv-src">Fonte: ${esc(c.evolution.source)}</p></section>`;
  }
  function modal() {
    let el = document.getElementById('fenixConvergenceModal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'fenixConvergenceModal';
    el.className = 'fenix-entity-modal-overlay';
    el.style.display = 'none';
    el.innerHTML = `<div class="fenix-entity-modal-backdrop" data-conv-close></div>
      <div class="fenix-entity-modal-dialog fenix-director-dialog" role="dialog" aria-modal="true" aria-labelledby="fenixConvTitle">
        <header class="fenix-entity-modal-header"><div class="entity-header-left"><span class="entity-type-badge">REDE</span><h3 class="entity-modal-title" id="fenixConvTitle">Convergência das IAs</h3></div>
          <button type="button" class="entity-modal-close" data-conv-close aria-label="Fechar">✕</button></header>
        <div class="fenix-director-body" id="fenixConvBody"><p class="fenix-director-empty">Lendo dados reais…</p></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (ev) => { if (ev.target.closest('[data-conv-close]')) el.style.display = 'none'; });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') el.style.display = 'none'; });
    return el;
  }
  window.fenixOpenConvergence = async function () {
    const el = modal();
    el.style.display = 'flex';
    const body = document.getElementById('fenixConvBody');
    body.innerHTML = '<p class="fenix-director-empty">Lendo dados reais…</p>';
    try { body.innerHTML = render(await load()); }
    catch (error) { body.innerHTML = '<p class="fenix-director-empty">Indicadores indisponíveis: ' + esc(error.message) + '</p>'; }
  };
})();