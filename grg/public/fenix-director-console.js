/**
 * FÊNIX — Console do Diretor (Fase 1, 2026-11-11)
 * Enviar UMA ordem ao Fênix, ver a fila "Precisa de você" e decidir: aprovar, rejeitar ou pedir
 * revisão. Tudo vem de /api/v2/director/* (store real); nada de número fixo — o contador começa em "—".
 */
(function () {
  'use strict';

  const POLL_MS = 15000;
  const KIND_LABEL = { analysis: 'Análise', change: 'Mudança de código', deploy: 'Publicação (deploy)' };
  let lastData = null;

  function token() {
    try { return localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || ''; } catch (_) { return ''; }
  }
  async function api(url, options = {}) {
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) };
    const t = token();
    if (t && t !== 'null' && t.length > 10) headers.Authorization = 'Bearer ' + t;
    let res = await fetch(url, { ...options, credentials: 'same-origin', headers });
    if (res.status === 401 && headers.Authorization) { delete headers.Authorization; res = await fetch(url, { ...options, credentials: 'same-origin', headers }); }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status));
    return body;
  }
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };

  function setCount(n) {
    const el = document.getElementById('footerDirectorCount');
    if (el) el.textContent = 'Precisa de você (' + (Number.isFinite(n) ? n : '—') + ')';
    const btn = document.getElementById('footerDirectorBtn');
    if (btn) btn.classList.toggle('has-pending', Number(n) > 0);
  }

  async function refreshCount() {
    try { lastData = await api('/api/v2/director/approvals?historyLimit=10'); setCount(lastData.queue.length); }
    catch (_) { setCount(NaN); }
  }

  function modal() {
    let el = document.getElementById('fenixDirectorModal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'fenixDirectorModal';
    el.className = 'fenix-entity-modal-overlay fenix-director-modal';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="fenix-entity-modal-backdrop" data-director-close></div>
      <div class="fenix-entity-modal-dialog fenix-director-dialog" role="dialog" aria-modal="true" aria-labelledby="fenixDirectorTitle">
        <header class="fenix-entity-modal-header">
          <div class="entity-header-left"><span class="entity-type-badge">DIRETOR</span><h3 class="entity-modal-title" id="fenixDirectorTitle">Fênix Diretor</h3></div>
          <button type="button" class="entity-modal-close" data-director-close aria-label="Fechar">✕</button>
        </header>
        <div class="fenix-director-body">
          <form class="fenix-director-order" id="fenixDirectorOrderForm">
            <label for="fenixDirectorOrderText">Ordem para o Fênix</label>
            <textarea id="fenixDirectorOrderText" rows="3" maxlength="4000" placeholder="Ex.: Corrija o status dos agentes que não atualiza depois do job" required></textarea>
            <div class="fenix-director-order-row">
              <select id="fenixDirectorKind" aria-label="Tipo de ordem">
                <option value="">Tipo: automático</option>
                <option value="analysis">Análise</option>
                <option value="change">Mudança de código (pede aprovação)</option>
                <option value="deploy">Publicação / deploy (pede aprovação)</option>
              </select>
              <select id="fenixDirectorProject" aria-label="Projeto"><option value="">Carregando projetos…</option></select>
              <button type="submit" class="fenix-director-send">Enviar ordem</button>
            </div>
            <p class="fenix-director-feedback" id="fenixDirectorFeedback" role="status"></p>
          </form>
          <section><h4>Precisa de você <span id="fenixDirectorQueueCount">—</span></h4><div id="fenixDirectorQueue" class="fenix-director-list"><p class="fenix-director-empty">Carregando…</p></div></section>
          <section><h4>Decisões recentes</h4><div id="fenixDirectorHistory" class="fenix-director-list"></div></section>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', onClick);
    el.querySelector('#fenixDirectorOrderForm').addEventListener('submit', onSubmit);
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && el.style.display !== 'none') close(); });
    return el;
  }

  function render(data) {
    const queue = data?.queue || [];
    const history = data?.history || [];
    document.getElementById('fenixDirectorQueueCount').textContent = '(' + queue.length + ')';
    setCount(queue.length);
    document.getElementById('fenixDirectorQueue').innerHTML = queue.length ? queue.map((item) => `
      <article class="fenix-director-item" data-mission="${esc(item.missionId)}" data-step="${esc(item.stepId)}">
        <div class="fenix-director-item-head"><span class="fenix-director-level level-${esc(String(item.level || '').toLowerCase())}">${esc(item.level || '—')}</span><strong>${esc(item.missionTitle || item.missionId)}</strong></div>
        <p class="fenix-director-reason">${esc(item.reason)}</p>
        <p class="fenix-director-meta">Etapa <code>${esc(item.stepKey)}</code> · agente ${esc(item.agent || '—')} · projeto ${esc(item.projectId || '—')} · pedido em ${esc(when(item.requestedAt))}</p>
        <div class="fenix-director-actions">
          <button type="button" data-decision="approve">Aprovar</button>
          <button type="button" data-decision="revise">Pedir revisão</button>
          <button type="button" data-decision="reject" class="danger">Rejeitar</button>
        </div>
        <div class="fenix-director-reason-box" hidden>
          <input type="text" maxlength="500" class="fenix-director-reason-input" aria-label="Motivo" />
          <button type="button" data-confirm>Confirmar</button>
          <button type="button" data-cancel>Cancelar</button>
        </div>
      </article>`).join('') : '<p class="fenix-director-empty">Nada aguardando você.</p>';
    document.getElementById('fenixDirectorHistory').innerHTML = history.length ? history.map((h) => `
      <div class="fenix-director-history-row"><span class="decision-${esc(h.decision)}">${h.decision === 'approved' ? 'Aprovado' : 'Rejeitado'}</span> ${esc(h.missionTitle || h.missionId)} · ${esc(h.decidedBy || '—')} · ${esc(when(h.decidedAt))}${h.reason ? ' · “' + esc(h.reason) + '”' : ''}</div>`).join('') : '<p class="fenix-director-empty">Nenhuma decisão ainda.</p>';
  }

  async function load() {
    try { lastData = await api('/api/v2/director/approvals?historyLimit=10'); render(lastData); }
    catch (error) { document.getElementById('fenixDirectorQueue').innerHTML = '<p class="fenix-director-empty">Não foi possível ler a fila: ' + esc(error.message) + '</p>'; setCount(NaN); }
  }

  function feedback(text, ok = true) {
    const el = document.getElementById('fenixDirectorFeedback');
    if (!el) return;
    el.textContent = text;
    el.className = 'fenix-director-feedback ' + (ok ? 'ok' : 'error');
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    const order = document.getElementById('fenixDirectorOrderText').value.trim();
    if (!order) return;
    const button = ev.target.querySelector('.fenix-director-send');
    button.disabled = true;
    feedback('Enviando ordem…');
    try {
      const res = await api('/api/v2/director/orders', { method: 'POST', body: JSON.stringify({ order, kind: document.getElementById('fenixDirectorKind').value || undefined, projectId: document.getElementById('fenixDirectorProject').value || undefined }) });
      const steps = (res.mission?.steps || []).map((s) => s.key + ' (' + s.agent + ')').join(' → ');
      feedback('Missão criada (' + (KIND_LABEL[res.kind] || res.kind) + '): ' + steps + (res.approvalRequired ? '. A etapa de risco vai aparecer aqui para você aprovar depois da inspeção.' : '.'));
      document.getElementById('fenixDirectorOrderText').value = '';
      setTimeout(load, 4000);
    } catch (error) {
      feedback('A ordem não foi registrada: ' + error.message, false);
    } finally {
      button.disabled = false;
    }
  }

  async function onClick(ev) {
    if (ev.target.closest('[data-director-close]')) return close();
    const card = ev.target.closest('.fenix-director-item');
    if (!card) return;
    const box = card.querySelector('.fenix-director-reason-box');
    const input = card.querySelector('.fenix-director-reason-input');
    if (ev.target.closest('[data-cancel]')) { box.hidden = true; return; }
    let decision;
    let reason = null;
    if (ev.target.closest('[data-confirm]')) {
      decision = card.dataset.pendingDecision;
      reason = input.value.trim();
      if (decision === 'revise' && !reason) { input.focus(); input.placeholder = 'Diga o que deve mudar (obrigatório)'; return; }
    } else {
      const btn = ev.target.closest('[data-decision]');
      if (!btn) return;
      decision = btn.getAttribute('data-decision');
      if (decision !== 'approve') {
        // Motivo dentro do cartao (sem janela nativa do navegador).
        card.dataset.pendingDecision = decision;
        input.value = '';
        input.placeholder = decision === 'revise' ? 'O que deve mudar na nova versão?' : 'Motivo da rejeição (opcional)';
        box.hidden = false;
        input.focus();
        return;
      }
    }
    card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      const res = await api('/api/v2/director/approvals/decide', { method: 'POST', body: JSON.stringify({ missionId: card.dataset.mission, stepId: card.dataset.step, decision, reason }) });
      feedback(res.decision === 'approved' ? 'Aprovado: a etapa foi liberada para execução.' : res.decision === 'rejected' ? 'Rejeitado: a missão foi cancelada.' : 'Revisão pedida: uma nova missão foi criada com o seu comentário.');
    } catch (error) {
      feedback('A decisão não foi registrada: ' + error.message, false);
    }
    load();
  }

  // Projetos reais do cadastro (projectKernel); o Fênix OS vem marcado quando existe.
  async function loadProjects() {
    const select = document.getElementById('fenixDirectorProject');
    if (!select || select.dataset.loaded === 'true') return;
    try {
      const res = await api('/api/fenix/projects');
      const projects = (res.projects || []).filter((p) => p && p.id);
      if (!projects.length) { select.innerHTML = '<option value="">Nenhum projeto cadastrado</option>'; return; }
      const preferred = projects.find((p) => /f[eê]nix\s*os/i.test(p.name || '')) || projects[0];
      select.innerHTML = projects.map((p) => '<option value="' + esc(p.id) + '"' + (p.id === preferred.id ? ' selected' : '') + '>' + esc(p.name || p.id) + '</option>').join('');
      select.dataset.loaded = 'true';
    } catch (error) {
      select.innerHTML = '<option value="">Projetos indisponíveis: ' + esc(error.message) + '</option>';
    }
  }

  function open() { modal().style.display = 'flex'; load(); loadProjects(); setTimeout(() => document.getElementById('fenixDirectorOrderText')?.focus(), 50); }
  function close() { const el = document.getElementById('fenixDirectorModal'); if (el) el.style.display = 'none'; }

  window.fenixOpenDirector = open;
  window.fenixCloseDirector = close;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { refreshCount(); setInterval(refreshCount, POLL_MS); });
  else { refreshCount(); setInterval(refreshCount, POLL_MS); }
})();