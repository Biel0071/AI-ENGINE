(() => {
  'use strict';
  const area = document.querySelector('#view-city .fenix-city-canvas-area');
  if (!area) return;
  const panel = document.createElement('section');
  panel.className = 'fcw-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Trabalho do Fênix');
  area.append(panel);
  const state = { mode: null, agentId: null, projectId: null, conversationId: null, jobId: null, busy: false, poll: null };
  const el = (tag, className, content) => { const node = document.createElement(tag); node.className = className; if (content != null) node.textContent = String(content); return node; };
  const token = () => localStorage.getItem('grg_token') || localStorage.getItem('fenix_token') || '';
  async function request(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { authorization: `Bearer ${token()}`, ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || data.error || data.reason || `HTTP ${response.status}`);
    return data;
  }
  function header(title, subtitle) {
    panel.replaceChildren();
    const head = el('div', 'fcw-header');
    const copy = el('div', 'fcw-header-copy'); copy.append(el('small', '', subtitle), el('h2', '', title));
    const close = el('button', 'fcw-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Fechar'); close.addEventListener('click', hide);
    head.append(copy, close); panel.append(head);
    panel.hidden = false;
  }
  function status(message, error = false) {
    let target = panel.querySelector('.fcw-status');
    if (!target) { target = el('p', 'fcw-status'); panel.append(target); }
    target.textContent = message; target.dataset.error = String(error);
  }
  function hide() { clearInterval(state.poll); state.poll = null; panel.hidden = true; state.mode = null; }
  function appendMessage(log, role, content) {
    const item = el('div', `fcw-message ${role}`, content);
    log.append(item); log.scrollTop = log.scrollHeight; return item;
  }
  async function stream(message, log, submit) {
    submit.disabled = true; state.busy = true; state.jobId = null;
    appendMessage(log, 'user', message);
    const answer = appendMessage(log, 'assistant', 'Conectando ao canal rápido…');
    try {
      const response = await fetch('/api/chat/stream', { method: 'POST', headers: { authorization: `Bearer ${token()}`, 'content-type': 'application/json', accept: 'text/event-stream' }, body: JSON.stringify({ message, conversationId: state.conversationId, agentId: state.agentId, projectId: state.projectId }) });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || body.reason || `HTTP ${response.status}`); }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let output = '';
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\n\n/); buffer = blocks.pop() || '';
        for (const block of blocks) {
          const kind = (block.match(/^event:\s*(.+)$/m) || [])[1];
          const raw = (block.match(/^data:\s*(.+)$/m) || [])[1]; if (!raw) continue;
          let data; try { data = JSON.parse(raw); } catch { continue; }
          if (data.conversationId) state.conversationId = data.conversationId;
          if (kind === 'token') { output += data.text || ''; answer.textContent = output; }
          if (kind === 'job' && data.jobId) { state.jobId = data.jobId; answer.textContent = `Job ${data.jobId} · ${data.status || 'na fila'}`; }
          if (kind === 'done' && data.text) answer.textContent = data.text;
          if (kind === 'error') throw new Error(data.message || 'Falha no canal rápido');
        }
      }
      if (!answer.textContent || answer.textContent === 'Conectando ao canal rápido…') answer.textContent = 'Nenhuma resposta recebida.';
      if (state.jobId) {
        const queuedId = state.jobId;
        const follow = el('button', 'fcw-secondary', 'Acompanhar job');
        follow.type = 'button'; follow.addEventListener('click', () => openJob(queuedId, 'platform'));
        log.append(follow);
      }
    } catch (error) { answer.textContent = `Falha: ${error.message}`; }
    finally { submit.disabled = false; state.busy = false; log.scrollTop = log.scrollHeight; }
  }
  async function openChat(agentId, projectId = null) {
    hide(); Object.assign(state, { mode: 'chat', agentId, projectId, conversationId: null, jobId: null });
    const agent = window.FENIX?.cityWorld?.snapshot?.agents?.find(item => item.id === agentId);
    header(`Conversar com ${agent?.name || agentId}`, projectId ? `AGENTE · ${projectId}` : 'AGENTE · CANAL RÁPIDO');
    const log = el('div', 'fcw-chat-log'); panel.append(log);
    const form = el('form', 'fcw-compose');
    const input = el('textarea', '', ''); input.placeholder = 'Escreva sua mensagem…'; input.rows = 3; input.required = true; input.maxLength = 4000;
    const submit = el('button', 'fcw-primary', 'Enviar'); submit.type = 'submit';
    form.append(input, submit); panel.append(form);
    form.addEventListener('submit', event => { event.preventDefault(); if (state.busy || !input.value.trim()) return; const message = input.value.trim(); input.value = ''; stream(message, log, submit); });
    const task = el('button', 'fcw-secondary', 'Criar tarefa para este agente'); task.type = 'button'; task.addEventListener('click', () => openTask(agentId, projectId)); panel.append(task);
    status('Carregando histórico…');
    try {
      const list = await request('/api/chat/conversations');
      if (state.mode !== 'chat' || state.agentId !== agentId) return;
      const match = (list.conversations || []).find(item => item.agentId === agentId && (item.projectId || null) === projectId);
      if (match) {
        state.conversationId = match.id;
        const history = await request(`/api/chat/conversations/${encodeURIComponent(match.id)}`);
        if (state.mode !== 'chat' || state.agentId !== agentId) return;
        for (const message of history.messages || []) {
          appendMessage(log, message.role, message.content);
          const queuedJob = message.role === 'assistant' && String(message.content || '').match(/^Tarefa enviada à API Platform\. Job ([A-Za-z0-9_-]+)\b/);
          if (queuedJob) {
            const follow = el('button', 'fcw-secondary', `Acompanhar job ${queuedJob[1].slice(0, 10)}`);
            follow.type = 'button'; follow.addEventListener('click', () => openJob(queuedJob[1], 'platform'));
            log.append(follow);
          }
        }
      } else {
        const created = await request('/api/chat/conversations', { method: 'POST', body: JSON.stringify({ agentId, projectId, title: `Conversa com ${agent?.name || agentId}` }) });
        state.conversationId = created.id;
      }
      status('Histórico persistente · mensagens ligadas ao agente e ao projeto');
    } catch (error) { status(`Histórico indisponível: ${error.message}`, true); }
  }
  function openTask(agentId, projectId = null) {
    hide(); Object.assign(state, { mode: 'task', agentId, projectId });
    const projects = window.FENIX?.cityWorld?.snapshot?.projects || [];
    header('Nova tarefa', `AGENTE · ${agentId}`);
    const form = el('form', 'fcw-task-form');
    const label = el('label', '', 'Projeto');
    const select = el('select', '');
    for (const project of projects) { const option = el('option', '', project.name || project.id); option.value = project.id; select.append(option); }
    if (projectId && projects.some(project => project.id === projectId)) select.value = projectId;
    label.append(select);
    const description = el('label', '', 'Objetivo da tarefa');
    const prompt = el('textarea', ''); prompt.placeholder = 'Descreva o resultado esperado e como validar…'; prompt.rows = 5; prompt.required = true; prompt.minLength = 12; prompt.maxLength = 8000; description.append(prompt);
    const note = el('p', 'fcw-note', 'A execução entra na fila do Fênix. Alterações de arquivos exigem testes; commit e publicação não são automáticos.');
    const submit = el('button', 'fcw-primary', 'Colocar na fila'); submit.type = 'submit';
    form.append(label, description, note, submit); panel.append(form);
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (state.busy) return;
      if (!select.value) return status('Selecione um projeto registrado.', true);
      state.busy = true; submit.disabled = true; status('Registrando job persistente…');
      try {
        const job = await request('/api/v2/jobs', { method: 'POST', body: JSON.stringify({ type: 'agent.execute', source: 'web', agentId, projectId: select.value, prompt: prompt.value.trim(), payload: { prompt: prompt.value.trim(), projectId: select.value, agentId, conversationId: state.conversationId || null }, context: { projectId: select.value, agentId, conversationId: state.conversationId || null }, riskLevel: 'MEDIUM' }) });
        state.projectId = select.value; openJob(job.jobId);
      } catch (error) { status(`Tarefa não registrada: ${error.message}`, true); }
      finally { state.busy = false; submit.disabled = false; }
    });
  }
  async function openJob(jobId, provider = 'local') {
    hide(); state.mode = 'job'; state.jobId = jobId; state.lastJobStatus = null;
    header(`Job ${jobId.slice(0, 12)}`, provider === 'platform' ? 'CANAL RÁPIDO · API PLATFORM' : 'EXECUÇÃO · JOB ENGINE');
    const details = el('div', 'fcw-job-details'); panel.append(details);
    const actions = el('div', 'fcw-job-actions'); panel.append(actions);
    async function update() {
      try {
        const job = await request(provider === 'platform' ? `/api/chat/jobs/${encodeURIComponent(jobId)}` : `/api/v2/jobs/${encodeURIComponent(jobId)}`);
        if (state.mode !== 'job' || state.jobId !== jobId) return;
        state.lastJobStatus = job.status;
        details.replaceChildren();
        for (const [key, value] of [['Estado', job.status], ['Etapa', job.currentStage || job.populationStatus], ['Progresso', job.progress == null ? '—' : `${job.progress}%`], ['Projeto', job.projectId || state.projectId], ['Agente', job.agent?.name || job.agentId || state.agentId], ['Tentativas', job.attempts], ['Resultado', job.result?.text || job.result?.result || job.result || job.error?.message || job.error || '—']]) {
          const row = el('div', 'fcw-job-row'); row.append(el('span', '', key), el('strong', '', value ?? '—')); details.append(row);
        }
        actions.replaceChildren();
        const button = (label, run) => { const node = el('button', 'fcw-secondary', label); node.type = 'button'; node.addEventListener('click', run); actions.append(node); };
        if (job.projectId || state.projectId) button('Abrir na IDE', () => openIde(job.projectId || state.projectId));
        if (job.agent?.agentId || state.agentId) button('Ver agente', () => { hide(); window.fenixWorld3D?.select('agent', job.agent?.agentId || state.agentId); });
        if (provider === 'local' && ['DEAD_LETTER', 'FAILED'].includes(job.status)) button('Tentar novamente', async () => { try { await request(`/api/v2/jobs/${encodeURIComponent(jobId)}/retry`, { method: 'POST' }); update(); } catch (error) { status(error.message, true); } });
        if (provider === 'local' && job.status === 'AWAITING_APPROVAL') button('Ver aprovação', () => window.showView?.('operations'));
        if (['SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED', 'completed', 'failed', 'cancelled'].includes(job.status)) { clearInterval(state.poll); state.poll = null; }
        status(`Atualizado ${new Date().toLocaleTimeString('pt-BR')}`);
      } catch (error) { status(`Falha ao consultar job: ${error.message}`, true); }
    }
    await update();
    if (state.mode === 'job' && !state.poll && !['SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED', 'completed', 'failed', 'cancelled'].includes(state.lastJobStatus)) state.poll = setInterval(update, 5000);
  }
  async function openIde(projectId) {
    if (!projectId) return status('Projeto não associado à atividade.', true);
    try {
      window.showView?.('ide');
      if (typeof window.fenixSelectIdeProject === 'function') await window.fenixSelectIdeProject(projectId);
      else throw new Error('IDE do projeto indisponível');
      hide();
    } catch (error) { status(`Não foi possível abrir a IDE: ${error.message}`, true); }
  }
  window.fenixCityWorkflow = { openChat, openTask, openJob, openIde, hide };
})();
