/* FÊNIX OS V8.1 — Fast Lane + Intelligent Job Queue Cockpit */
(function () {
  'use strict';
  var F = window.FenixV8 = {
    projects: [],
    events: [],
    jobs: [],
    queueStatus: { isPaused: false, active: 0, queued: 0, completed: 0, failed: 0, pendingConfirmation: 0 },
    tokens: 0,
    fastChatsCount: 0,
    activeTab: 'all',
    selectedJob: null,
    started: Date.now(),
    activeProject: null,
    currentModelMode: 'AUTO'
  };

  var PROJ = {
    'fenix-os':      { label: 'FENIX OS',      icon: 'F', color: '#4488ff' },
    'api-platform':  { label: 'API Platform',   icon: 'A', color: '#9b59b6' },
    'zapai-crm':     { label: 'ZapAI CRM',      icon: 'Z', color: '#e67e22' }
  };

  function css(el, styles) { Object.assign(el.style, styles); }

  function mk(tag, attrs, parent) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'style') el.style.cssText = attrs[k];
        else if (k.startsWith('on')) el[k] = attrs[k];
        else el[k] = attrs[k];
      });
    }
    if (parent) parent.appendChild(el);
    return el;
  }

  function getAuthHeader() {
    var tok = window._fenixToken || localStorage.getItem('token') || localStorage.getItem('grg_token') || '';
    return tok ? { 'Authorization': 'Bearer ' + tok } : {};
  }

  /* ═══ TOPBAR INTEGRATION ═══ */
  function updateTopbar() {
    var tokEl = document.getElementById('kpiTokens');
    if (tokEl) tokEl.textContent = F.tokens > 999 ? Math.floor(F.tokens / 1000) + 'k' : F.tokens;

    var modEl = document.getElementById('activeModel');
    if (modEl) modEl.textContent = F.currentModelMode === 'FAST' ? '⚡ FAST LANE' : '🧠 QWEN 2.5 (3B)';

    var workerEl = document.getElementById('kpiWorker');
    if (workerEl) {
      var isPaused = F.queueStatus && F.queueStatus.isPaused;
      workerEl.textContent = isPaused ? '⏸ PAUSED' : 'ONLINE (C1)';
      workerEl.className = 'orch-meta-val ' + (isPaused ? 'yellow' : 'green');
    }

    // Lane indicators strip in topbar
    var strip = document.querySelector('.orch-telemetry-strip');
    if (strip && !document.getElementById('fv8-lane-fast')) {
      var fastChip = mk('div', { id: 'fv8-lane-fast', className: 'orch-meta-chip', title: 'Fast Lane — Respostas Instantâneas' }, strip);
      fastChip.innerHTML = '<span class="orch-meta-label">FAST LANE</span><span class="orch-meta-val green" id="fv8-fast-val">⚡ 0 chats</span>';

      var jobChip = mk('div', { id: 'fv8-lane-job', className: 'orch-meta-chip', title: 'Job Queue — Processamento em Segundo Plano' }, strip);
      jobChip.style.cursor = 'pointer';
      jobChip.onclick = togglePanel;
      jobChip.innerHTML = '<span class="orch-meta-label">JOB QUEUE</span><span class="orch-meta-val" id="fv8-job-val" style="color:#f39c12">⚙ 0 q / 0 run</span>';
    }

    var fastVal = document.getElementById('fv8-fast-val');
    if (fastVal) fastVal.textContent = '⚡ ' + F.fastChatsCount + ' chats';

    var jobVal = document.getElementById('fv8-job-val');
    if (jobVal && F.queueStatus) {
      jobVal.textContent = '⚙ ' + (F.queueStatus.queued || 0) + ' q / ' + (F.queueStatus.running || 0) + ' run';
    }
  }

  /* ═══ DRAWER & PANEL BUILDER ═══ */
  function panel() {
    var p = mk('div', { id: 'fv8-panel' });
    css(p, {
      position: 'fixed', top: '0', right: '0', width: '380px', height: '100vh',
      zIndex: '99999', background: 'rgba(6,10,20,0.98)',
      borderLeft: '1px solid rgba(68,136,255,0.25)',
      fontFamily: 'SF Mono,Consolas,monospace', fontSize: '11.5px', color: '#c8d8f0',
      display: 'none', flexDirection: 'column', backdropFilter: 'blur(16px)',
      boxShadow: '-8px 0 24px rgba(0,0,0,0.7)'
    });

    /* Header */
    var hdr = mk('div', null, p);
    css(hdr, { padding: '12px 16px', borderBottom: '1px solid rgba(68,136,255,0.2)', background: 'linear-gradient(135deg,rgba(68,136,255,0.15),rgba(155,89,182,0.1))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
    var hInfo = mk('div', null, hdr);
    mk('div', { textContent: 'FÊNIX OS V8.2', style: 'font-size:13px;letter-spacing:2px;color:#4488ff;font-weight:800' }, hInfo);
    mk('div', { textContent: 'AI CONVERSATION + INTELLIGENT EXECUTION', style: 'font-size:8.5px;color:#7088a8;letter-spacing:1px;margin-top:2px' }, hInfo);

    var closeBtn = mk('button', { textContent: '✕', onclick: togglePanel }, hdr);
    css(closeBtn, { background: 'transparent', border: 'none', color: '#7088a8', fontSize: '14px', cursor: 'pointer' });

    /* Body */
    var body = mk('div', { id: 'fv8-body' }, p);
    css(body, { flex: '1', overflowY: 'auto', padding: '12px' });

    /* Metrics grid */
    var sec = section(body, 'LANE & QUEUE METRICS');
    var grid = mk('div', null, sec);
    css(grid, { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' });
    metric(grid, 'fv8-tok', '0', 'TOKENS');
    metric(grid, 'fv8-jobs-active', '0', 'RUNNING');
    metric(grid, 'fv8-jobs-queued', '0', 'QUEUED');
    metric(grid, 'fv8-up', '0m', 'UPTIME');

    /* Queue Controls Bar */
    var ctrlSec = section(body, 'CONTROLES DA FILA');
    var ctrlRow = mk('div', null, ctrlSec);
    css(ctrlRow, { display: 'flex', gap: '6px', flexWrap: 'wrap' });
    
    var btnResume = mk('button', { id: 'fv8-btn-resume', textContent: '▶ ATIVAR FILA', onclick: resumeQueue }, ctrlRow);
    styleBtn(btnResume, '#2ecc71');
    var btnPause = mk('button', { id: 'fv8-btn-pause', textContent: '⏸ PAUSAR FILA', onclick: pauseQueue }, ctrlRow);
    styleBtn(btnPause, '#f39c12');
    var btnClear = mk('button', { textContent: '🗑 LIMPAR CONCLUÍDOS', onclick: clearCompleted }, ctrlRow);
    styleBtn(btnClear, '#94a3b8');
    var btnRefresh = mk('button', { textContent: '↻ REFRESH', onclick: loadJobs }, ctrlRow);
    styleBtn(btnRefresh, '#4488ff');

    /* Model Selector */
    var modelSec = section(body, 'SELETOR DE MODELO');
    var modelRow = mk('div', null, modelSec);
    css(modelRow, { display: 'flex', gap: '4px' });
    ['AUTO', 'FAST', 'QWEN'].forEach(function(m) {
      var mb = mk('button', { id: 'fv8-mbtn-' + m, textContent: m, onclick: function() { setModelMode(m); } }, modelRow);
      styleBtn(mb, m === F.currentModelMode ? '#4488ff' : '#4a6080');
      mb.style.flex = '1';
    });

    /* Tabbed Jobs Section */
    var jobsSec = section(body, 'JOB QUEUE');
    var tabRow = mk('div', null, jobsSec);
    css(tabRow, { display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px' });
    [
      { id: 'all', label: 'TODOS' },
      { id: 'running', label: 'RUNNING' },
      { id: 'queued', label: 'FILA' },
      { id: 'pending', label: 'CONFIRMAR' },
      { id: 'completed', label: 'FEITOS' },
      { id: 'failed', label: 'FALHAS' },
      { id: 'paused', label: 'PAUSADOS' },
      { id: 'cancelled', label: 'CANCELADOS' }
    ].forEach(function(t) {
      var tb = mk('button', {
        id: 'fv8-tab-' + t.id,
        textContent: t.label,
        onclick: function() { F.activeTab = t.id; renderJobs(); }
      }, tabRow);
      css(tb, { background: 'transparent', border: 'none', color: t.id === F.activeTab ? '#4488ff' : '#64748b', fontSize: '9px', cursor: 'pointer', padding: '2px 4px', fontWeight: '700' });
    });

    var jobsList = mk('div', { id: 'fv8-joblist' }, jobsSec);
    css(jobsList, { maxHeight: '220px', overflowY: 'auto' });

    /* Projects */
    var projSec = section(body, 'PROJECTS');
    mk('div', { id: 'fv8-proj', textContent: 'Loading...' }, projSec);

    /* Live Events */
    var evSec = section(body, 'LIVE EVENTS');
    var evList = mk('div', { id: 'fv8-evlist' }, evSec);
    css(evList, { maxHeight: '110px', overflowY: 'auto' });

    /* Quick Enqueue */
    var enqSec = section(body, 'ENQUEUE NEW TASK');
    var sel1 = mk('select', { id: 'fv8-type' }, enqSec);
    styleSelect(sel1);
    ['analyze', 'scan', 'explain', 'code_change'].forEach(function (v) { mk('option', { value: v, textContent: v.toUpperCase() }, sel1); });
    var sel2 = mk('select', { id: 'fv8-psel' }, enqSec);
    styleSelect(sel2);
    Object.keys(PROJ).forEach(function (k) { mk('option', { value: k, textContent: PROJ[k].label }, sel2); });
    var btn = mk('button', { textContent: 'ENQUEUE TASK', onclick: enqJob }, enqSec);
    styleBtn(btn, '#4488ff');
    btn.style.width = '100%';
    btn.style.marginTop = '4px';
    mk('div', { id: 'fv8-res', style: 'font-size:9.5px;color:#7088a8;margin-top:4px' }, enqSec);

    document.body.appendChild(p);

    /* Job Details Modal */
    createJobDetailsModal();

    /* Toggle button */
    var tb = mk('button', { id: 'fv8-toggle-btn', textContent: 'V8.2' });
    css(tb, {
      position: 'fixed', top: '50%', right: '0', zIndex: '100000',
      transform: 'translateY(-50%)', background: '#4488ff', color: '#fff',
      border: 'none', cursor: 'pointer', padding: '10px 5px',
      borderRadius: '6px 0 0 6px', fontSize: '10px', writingMode: 'vertical-rl',
      letterSpacing: '1px', fontWeight: '800', boxShadow: '-2px 0 10px rgba(68,136,255,0.4)'
    });
    tb.onclick = togglePanel;
    document.body.appendChild(tb);
  }

  function togglePanel() {
    var p = document.getElementById('fv8-panel');
    if (p) p.style.display = p.style.display === 'none' ? 'flex' : 'none';
    if (p && p.style.display === 'flex') {
      loadJobs();
      loadProjects();
    }
  }

  function section(parent, title) {
    var wrap = mk('div', null, parent);
    css(wrap, { marginBottom: '12px' });
    var t = mk('div', { textContent: title }, wrap);
    css(t, { fontSize: '8.5px', letterSpacing: '1.5px', color: '#64748b', borderBottom: '1px solid rgba(68,136,255,0.1)', paddingBottom: '4px', marginBottom: '6px', fontWeight: '700' });
    return wrap;
  }

  function metric(parent, id, val, label) {
    var box = mk('div', null, parent);
    css(box, { background: 'rgba(68,136,255,0.06)', border: '1px solid rgba(68,136,255,0.15)', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' });
    mk('div', { id: id, textContent: val, style: 'font-size:14px;font-weight:800;color:#4488ff;line-height:1' }, box);
    mk('div', { textContent: label, style: 'font-size:7.5px;color:#64748b;margin-top:3px;letter-spacing:0.5px' }, box);
  }

  function styleBtn(btn, color) {
    css(btn, {
      background: color + '18', border: '1px solid ' + color + '44',
      color: color, padding: '5px 8px', borderRadius: '4px',
      cursor: 'pointer', fontFamily: 'inherit', fontSize: '9.5px', fontWeight: '700'
    });
  }

  function styleSelect(el) {
    css(el, {
      width: '100%', background: '#0a1020', color: '#c8d8f0',
      border: '1px solid rgba(68,136,255,0.25)', padding: '5px',
      borderRadius: '4px', fontFamily: 'inherit', marginBottom: '4px', fontSize: '11px'
    });
  }

  function upd(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

  function updMetrics() {
    upd('fv8-tok', F.tokens > 999 ? Math.floor(F.tokens / 1000) + 'K' : F.tokens);
    upd('fv8-jobs-active', F.queueStatus.running || 0);
    upd('fv8-jobs-queued', F.queueStatus.queued || 0);
    var m = Math.floor((Date.now() - F.started) / 60000);
    upd('fv8-up', m > 60 ? Math.floor(m / 60) + 'h' : m + 'm');
    updateTopbar();
  }

  /* ═══ JOBS RENDERING ═══ */
  function renderJobs() {
    var el = document.getElementById('fv8-joblist');
    if (!el) return;
    var list = F.jobs || [];

    if (F.activeTab === 'running') list = list.filter(function(j) { return j.status === 'RUNNING'; });
    else if (F.activeTab === 'queued') list = list.filter(function(j) { return j.status === 'QUEUED'; });
    else if (F.activeTab === 'pending') list = list.filter(function(j) { return j.status === 'PENDING_CONFIRMATION'; });
    else if (F.activeTab === 'completed') list = list.filter(function(j) { return j.status === 'COMPLETED'; });
    else if (F.activeTab === 'failed') list = list.filter(function(j) { return j.status === 'FAILED'; });
    else if (F.activeTab === 'paused') list = list.filter(function(j) { return j.status === 'PAUSED'; });
    else if (F.activeTab === 'cancelled') list = list.filter(function(j) { return j.status === 'CANCELLED'; });

    if (!list.length) {
      el.innerHTML = '<div style="font-size:10px;color:#64748b;padding:8px;text-align:center;">Nenhum job nesta categoria</div>';
      return;
    }

    el.innerHTML = '';
    list.slice(0, 15).forEach(function(j) {
      var card = mk('div', null, el);
      var statusColor = j.status === 'COMPLETED' ? '#2ecc71' : j.status === 'RUNNING' ? '#3498db' : j.status === 'PENDING_CONFIRMATION' ? '#f39c12' : j.status === 'FAILED' ? '#e74c3c' : '#95a5a6';

      css(card, {
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '6px', padding: '8px', marginBottom: '6px',
        borderLeft: '3px solid ' + statusColor
      });

      // Top row: ID + Status + Actions
      var row1 = mk('div', null, card);
      css(row1, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' });
      mk('div', { textContent: '#' + j.id + ' ' + (j.title || j.type), style: 'font-weight:700;font-size:11px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px' }, row1);

      var badge = mk('span', { textContent: j.status }, row1);
      css(badge, { fontSize: '8px', padding: '2px 4px', borderRadius: '3px', background: statusColor + '22', color: statusColor, fontWeight: '700' });

      // Sub row: project, model, tokens
      var row2 = mk('div', null, card);
      css(row2, { display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginBottom: '6px' });
      mk('span', { textContent: (j.projectId || 'fenix-os') + ' • ' + (j.model || 'qwen') }, row2);
      mk('span', { textContent: (j.tokens && j.tokens.actual ? j.tokens.actual + ' tk' : '~' + (j.tokens ? j.tokens.estimated : 600) + ' tk') }, row2);

      // Actions row
      var actRow = mk('div', null, card);
      css(actRow, { display: 'flex', gap: '4px', marginTop: '4px' });

      if (j.status === 'PENDING_CONFIRMATION') {
        var confBtn = mk('button', { textContent: '✓ CONFIRMAR', onclick: function() { confirmJob(j.id); } }, actRow);
        styleBtn(confBtn, '#2ecc71');
        var cancBtn = mk('button', { textContent: '✕ CANCELAR', onclick: function() { cancelJob(j.id); } }, actRow);
        styleBtn(cancBtn, '#e74c3c');
        var modBtn = mk('button', { textContent: '⚙ MODELO', onclick: function() { changeJobModel(j.id); } }, actRow);
        styleBtn(modBtn, '#9b59b6');
      } else if (j.status === 'RUNNING' || j.status === 'QUEUED' || j.status === 'PAUSED') {
        var cancBtn2 = mk('button', { textContent: '✕ CANCELAR', onclick: function() { cancelJob(j.id); } }, actRow);
        styleBtn(cancBtn2, '#e74c3c');
        if (j.status !== 'RUNNING') {
          var modBtn2 = mk('button', { textContent: '⚙ MODELO', onclick: function() { changeJobModel(j.id); } }, actRow);
          styleBtn(modBtn2, '#9b59b6');
        }
      } else if (j.status === 'FAILED' || j.status === 'CANCELLED') {
        var retBtn = mk('button', { textContent: '↻ RETRY', onclick: function() { retryJob(j.id); } }, actRow);
        styleBtn(retBtn, '#4488ff');
      }

      var detBtn = mk('button', { textContent: '🔍 DETALHES', onclick: function() { showJobDetails(j); } }, actRow);
      styleBtn(detBtn, '#64748b');
      detBtn.style.marginLeft = 'auto';
    });
  }

  function changeJobModel(id) {
    var newM = prompt('Informe o novo modelo para o Job #' + id + ' (ex: qwen2.5:3b, fast):', 'qwen2.5:3b');
    if (!newM) return;
    fetch('/api/v2/jobs/' + id + '/model', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, getAuthHeader()),
      body: JSON.stringify({ model: newM.trim() })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.ok) {
        alert('Modelo do Job #' + id + ' atualizado para ' + newM);
        loadJobs();
      } else {
        alert('Erro: ' + (d.error || 'Falha ao atualizar'));
      }
    })
    .catch(function(e) { alert('Erro: ' + e.message); });
  }

  /* ═══ JOB DETAILS MODAL ═══ */
  function createJobDetailsModal() {
    var m = mk('div', { id: 'fv8-job-modal' });
    css(m, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      zIndex: '100005', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      display: 'none', justifyContent: 'center', alignItems: 'center'
    });

    var box = mk('div', null, m);
    css(box, {
      width: '600px', maxHeight: '85vh', background: '#0a1020',
      border: '1px solid rgba(68,136,255,0.3)', borderRadius: '8px',
      display: 'flex', flexDirection: 'column', padding: '16px',
      color: '#c8d8f0', fontFamily: 'SF Mono,Consolas,monospace', fontSize: '11px'
    });

    var mHdr = mk('div', null, box);
    css(mHdr, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '12px' });
    mk('div', { id: 'fv8-mdl-title', style: 'font-size:14px;font-weight:700;color:#4488ff;' }, mHdr);
    var close = mk('button', { textContent: '✕', onclick: function() { m.style.display = 'none'; } }, mHdr);
    css(close, { background: 'none', border: 'none', color: '#64748b', fontSize: '16px', cursor: 'pointer' });

    var mBody = mk('div', { id: 'fv8-mdl-body' }, box);
    css(mBody, { flex: '1', overflowY: 'auto' });

    document.body.appendChild(m);
  }

  function showJobDetails(j) {
    var m = document.getElementById('fv8-job-modal');
    var tit = document.getElementById('fv8-mdl-title');
    var b = document.getElementById('fv8-mdl-body');
    if (!m || !b) return;

    tit.textContent = 'Job #' + j.id + ' — ' + (j.title || j.type);
    b.innerHTML = '';

    function addSec(title, content) {
      var d = mk('div', null, b);
      css(d, { marginBottom: '10px' });
      mk('div', { textContent: title, style: 'font-size:9px;color:#64748b;letter-spacing:1px;font-weight:700;margin-bottom:3px;' }, d);
      var c = mk('div', null, d);
      css(c, { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '6px 8px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' });
      c.textContent = content || '—';
      return d;
    }

    var metaText = '• Status: ' + j.status + '\n' +
      '• Prioridade: ' + (j.priority || 'NORMAL') + ' (Nível ' + (j.priorityLevel || 3) + ')\n' +
      '• Progresso: ' + (j.progress || 0) + '%\n' +
      '• Projeto: ' + j.projectId + ' | Agente: ' + j.agentId + '\n' +
      '• Modelo: ' + j.model + ' | Provedor: ' + j.provider + '\n' +
      '• Tokens: Real ' + ((j.tokens && j.tokens.actual) || j.actualTokens || 0) + ' | Estimado ~' + ((j.tokens && j.tokens.estimated) || j.estimatedTokens || 600) + ' (Budget: ' + (j.tokenBudget != null ? j.tokenBudget : '—') + ')\n' +
      '• Latência: ' + (j.actualLatencyMs || 0) + 'ms\n' +
      '• Criado em: ' + (j.createdAt || '—') + '\n' +
      '• Iniciado em: ' + (j.startedAt || '—') + '\n' +
      '• Concluído em: ' + (j.completedAt || '—') +
      (j.fallback ? '\n• Fallback: Sim (' + (j.fallbackReason || 'Engaged') + ')' : '');

    addSec('STATUS & METADATA', metaText);
    addSec('OBJECTIVE', j.objective);
    addSec('ENHANCED PROMPT', j.enhancedPrompt || j.rawPrompt);
    
    var stepsTxt = (j.steps || []).map(function(s) { return '• ' + s.name + ' (' + s.status + ') - ' + (s.timestamp ? s.timestamp.slice(11, 19) : ''); }).join('\n');
    addSec('TIMELINE STEPS', stepsTxt || 'QUEUED');

    if (j.result) addSec('RESULT / OUTPUT', j.result);
    if (j.error) addSec('ERROR', j.error);

    m.style.display = 'flex';
  }

  /* ═══ API ACTIONS ═══ */
  function pauseQueue() {
    fetch('/api/v2/queue/pause', { method: 'POST', headers: getAuthHeader() })
      .then(function(r) { return r.json(); })
      .then(function() { loadJobs(); })
      .catch(function(e) { alert('Erro ao pausar fila: ' + e.message); });
  }

  function resumeQueue() {
    fetch('/api/v2/queue/resume', { method: 'POST', headers: getAuthHeader() })
      .then(function(r) { return r.json(); })
      .then(function() { loadJobs(); })
      .catch(function(e) { alert('Erro ao retomar fila: ' + e.message); });
  }

  function confirmJob(id) {
    fetch('/api/v2/jobs/' + id + '/confirm', { method: 'POST', headers: getAuthHeader() })
      .then(function(r) { return r.json(); })
      .then(function() { loadJobs(); })
      .catch(function(e) { alert('Erro ao confirmar job: ' + e.message); });
  }

  function cancelJob(id) {
    fetch('/api/v2/jobs/' + id + '/cancel', { method: 'POST', headers: getAuthHeader() })
      .then(function(r) { return r.json(); })
      .then(function() { loadJobs(); })
      .catch(function(e) { alert('Erro ao cancelar job: ' + e.message); });
  }

  function retryJob(id) {
    fetch('/api/v2/jobs/' + id + '/retry', { method: 'POST', headers: getAuthHeader() })
      .then(function(r) { return r.json(); })
      .then(function() { loadJobs(); })
      .catch(function(e) { alert('Erro ao reenviar job: ' + e.message); });
  }

  function clearCompleted() {
    fetch('/api/v2/queue/clear-completed', { method: 'POST', headers: getAuthHeader() })
      .then(function(r) { return r.json(); })
      .then(function() { loadJobs(); })
      .catch(function(e) { alert('Erro ao limpar concluídos: ' + e.message); });
  }

  function setModelMode(mode) {
    F.currentModelMode = mode;
    fetch('/api/v2/conversation', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, getAuthHeader()),
      body: JSON.stringify({ message: '/model ' + mode.toLowerCase() })
    }).then(function() {
      ['AUTO', 'FAST', 'QWEN'].forEach(function(m) {
        var btn = document.getElementById('fv8-mbtn-' + m);
        if (btn) styleBtn(btn, m === mode ? '#4488ff' : '#4a6080');
      });
      updateTopbar();
    });
  }

  function loadJobs() {
    fetch('/api/v2/jobs', { headers: getAuthHeader() })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.ok) {
          F.jobs = d.jobs || [];
          if (d.queue) F.queueStatus = d.queue;
          renderJobs();
          updMetrics();
        }
      }).catch(function() {});
  }

  function renderProjects() {
    var el = document.getElementById('fv8-proj');
    if (!el) return;
    if (!F.projects.length) { el.textContent = 'Nenhum projeto carregado'; return; }
    el.innerHTML = '';
    F.projects.slice(0, 3).forEach(function (p) {
      var id = p.projectId || p.id || 'fenix-os';
      var cfg = PROJ[id] || { label: id, icon: id[0].toUpperCase(), color: '#4488ff' };
      var card = mk('div', null, el);
      css(card, { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '6px 8px', marginBottom: '4px', cursor: 'pointer' });
      if (F.activeProject === id) css(card, { borderColor: 'rgba(68,136,255,0.4)', background: 'rgba(68,136,255,0.06)' });
      card.onclick = function () { F.selectProject(id); };
      var row = mk('div', null, card);
      css(row, { display: 'flex', alignItems: 'center', gap: '6px' });
      var ico = mk('div', { textContent: cfg.icon }, row);
      css(ico, { width: '22px', height: '22px', borderRadius: '4px', background: cfg.color + '22', color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '11px', flexShrink: '0' });
      var info = mk('div', null, row);
      mk('div', { textContent: cfg.label, style: 'font-size:10.5px;font-weight:600' }, info);
      mk('div', { textContent: p.vpsPath || p.status || 'active', style: 'font-size:8.5px;color:#64748b' }, info);
    });
  }

  function addEvent(ev) {
    F.events.unshift(ev);
    if (F.events.length > 50) F.events.pop();
    var el = document.getElementById('fv8-evlist');
    if (!el) return;
    var t = ev.type || '?';
    var co = t.indexOf('job') >= 0 ? '#f39c12' : t.indexOf('agent') >= 0 ? '#2ecc71' : t.indexOf('chat') >= 0 ? '#00f0ff' : '#4488ff';
    var row = mk('div', null, null);
    css(row, { padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '9.5px', display: 'flex', justifyContent: 'space-between' });
    row.innerHTML = '<span style="display:inline-block;padding:1px 4px;border-radius:2px;font-size:8.5px;background:' + co + '22;color:' + co + '">' + t + '</span>' +
      '<span style="color:#64748b;font-size:8px;">' + (ev.timestamp ? ev.timestamp.slice(11, 19) : '') + '</span>';
    el.insertBefore(row, el.firstChild);
    while (el.children.length > 15) el.removeChild(el.lastChild);
    updMetrics();
  }

  function connectSSE() {
    try {
      if (!window.__FENIX_SSE_SOURCE__ || window.__FENIX_SSE_SOURCE__.readyState === 2) {
        window.__FENIX_SSE_SOURCE__ = new EventSource('/api/v2/events/stream');
      }
      var es = window.__FENIX_SSE_SOURCE__;
      es.addEventListener('message', function (e) {
        try {
          var ev = JSON.parse(e.data);
          if (ev.type === 'heartbeat') return;
          addEvent(ev);
          if (ev.type === 'chat.response') {
            F.fastChatsCount++;
            if (ev.data && ev.data.tokens) F.tokens += (ev.data.tokens || 0);
          }
          if (ev.type.indexOf('job') >= 0 || ev.type.indexOf('queue') >= 0) {
            loadJobs();
          }
          if (ev.data && ev.data.tokens) {
            F.tokens += (ev.data.tokens || 0);
          }
          updMetrics();
        } catch (err) {}
      });
    } catch (e) { console.warn('[FenixV8] SSE error:', e.message); }
  }

  function loadProjects() {
    fetch('/api/v2/public/projects', { signal: AbortSignal.timeout(6000) })
      .then(function (r) { return r.json(); })
      .then(function (d) { F.projects = d.projects || []; renderProjects(); })
      .catch(function () {});
  }

  function enqJob() {
    var ty = document.getElementById('fv8-type').value;
    var pr = document.getElementById('fv8-psel').value;
    var re = document.getElementById('fv8-res');
    if (re) re.textContent = 'Enfileirando...';
    fetch('/api/v2/conversation', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, getAuthHeader()),
      body: JSON.stringify({ message: (ty === 'analyze' ? 'Analise o ' : ty === 'scan' ? 'Mapeie o ' : 'Explique o ') + pr })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (re) re.textContent = d.ok ? (d.lane === 'JOB_LANE' ? 'Job #' + d.job.id + ' criado!' : d.response.slice(0, 40)) : 'Erro';
      loadJobs();
    }).catch(function (e) { if (re) re.textContent = 'Error: ' + e.message.slice(0, 30); });
  }

  F.selectProject = function (id) {
    F.activeProject = id;
    renderProjects();
    addEvent({ type: 'project.selected', timestamp: new Date().toISOString(), data: { projectId: id } });
  };

  window.fenixQuickCmd = function(cmd) {
    var input = document.getElementById('masterPrompt');
    var send = document.getElementById('masterCmdSubmit');
    if (input && send) {
      input.value = cmd;
      send.click();
    } else {
      fetch('/api/v2/conversation', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, getAuthHeader()),
        body: JSON.stringify({ message: cmd })
      }).then(function(r) { return r.json(); }).then(function() {
        loadJobs();
      });
    }
  };

  function init() {
    panel();
    updateTopbar();
    connectSSE();
    loadProjects();
    loadJobs();
    setInterval(updMetrics, 15000);
    setInterval(loadJobs, 20000);
    setInterval(loadProjects, 60000);
    console.log('[FenixV8.2] AI Conversation + Intelligent Execution Cockpit online');
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { setTimeout(init, 300); }
})();
