/* FENIX OS V8 — Live Runtime Cockpit Panel */
(function () {
  'use strict';
  var F = window.FenixV8 = { projects: [], events: [], tokens: 0, jobs: 0, sse: null, started: Date.now(), activeProject: null };

  var PROJ = {
    'fenix-os':      { label: 'FENIX OS',      icon: 'F', color: '#4488ff' },
    'api-platform':  { label: 'API Platform',   icon: 'A', color: '#9b59b6' },
    'zapai-crm':     { label: 'ZapAI CRM',      icon: 'Z', color: '#e67e22' }
  };

  function css(el, styles) { Object.assign(el.style, styles); }

  function mk(tag, attrs, parent) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el[k] = attrs[k]; });
    if (parent) parent.appendChild(el);
    return el;
  }

  function panel() {
    var p = mk('div', { id: 'fv8-panel' });
    css(p, {
      position: 'fixed', top: '0', right: '0', width: '300px', height: '100vh',
      zIndex: '99999', background: 'rgba(6,10,20,0.97)',
      borderLeft: '1px solid rgba(68,136,255,0.2)',
      fontFamily: 'SF Mono,Consolas,monospace', fontSize: '12px', color: '#c8d8f0',
      display: 'flex', flexDirection: 'column', backdropFilter: 'blur(12px)'
    });

    /* Header */
    var hdr = mk('div', null, p);
    css(hdr, { padding: '12px 14px', borderBottom: '1px solid rgba(68,136,255,0.2)', background: 'linear-gradient(135deg,rgba(68,136,255,0.12),rgba(155,89,182,0.08))' });
    mk('div', { textContent: 'FENIX V8', style: 'font-size:13px;letter-spacing:2px;color:#4488ff;font-weight:700' }, hdr);
    mk('div', { textContent: 'LIVE RUNTIME COCKPIT', style: 'font-size:9px;color:#4a6080;letter-spacing:1px;margin-top:2px' }, hdr);

    /* Body */
    var body = mk('div', { id: 'fv8-body' }, p);
    css(body, { flex: '1', overflowY: 'auto', padding: '10px' });

    /* Metrics grid */
    var sec = section(body, 'RUNTIME METRICS');
    var grid = mk('div', null, sec);
    css(grid, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' });
    metric(grid, 'fv8-tok', '0', 'TOKENS');
    metric(grid, 'fv8-jobs', '0', 'JOBS');
    metric(grid, 'fv8-evts', '0', 'EVENTS');
    metric(grid, 'fv8-up', '0m', 'UPTIME');

    /* Projects */
    var projSec = section(body, 'PROJECTS');
    mk('div', { id: 'fv8-proj', textContent: 'Loading...' }, projSec);

    /* Events */
    var evSec = section(body, 'LIVE EVENTS');
    var evList = mk('div', { id: 'fv8-evlist' }, evSec);
    css(evList, { maxHeight: '150px', overflowY: 'auto' });

    /* Quick job */
    var jobSec = section(body, 'ENQUEUE JOB');
    var sel1 = mk('select', { id: 'fv8-type' }, jobSec);
    styleSelect(sel1);
    ['analyze', 'scan', 'explain'].forEach(function (v) { mk('option', { value: v, textContent: v.toUpperCase() }, sel1); });
    var sel2 = mk('select', { id: 'fv8-psel' }, jobSec);
    styleSelect(sel2);
    Object.keys(PROJ).forEach(function (k) { mk('option', { value: k, textContent: PROJ[k].label }, sel2); });
    var btn = mk('button', { textContent: 'ENQUEUE', onclick: enqJob }, jobSec);
    css(btn, { width: '100%', background: 'rgba(68,136,255,0.15)', border: '1px solid rgba(68,136,255,0.3)', color: '#4488ff', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', marginTop: '4px' });
    mk('div', { id: 'fv8-res', style: 'font-size:10px;color:#4a6080;margin-top:4px' }, jobSec);

    document.body.appendChild(p);

    /* Toggle button */
    var tb = mk('button', { textContent: 'V8' });
    css(tb, { position: 'fixed', top: '50%', right: '0', zIndex: '100000', transform: 'translateY(-50%)', background: '#4488ff', color: '#fff', border: 'none', cursor: 'pointer', padding: '8px 4px', borderRadius: '6px 0 0 6px', fontSize: '10px', writingMode: 'vertical-rl', letterSpacing: '1px' });
    tb.onclick = function () { p.style.display = p.style.display === 'none' ? 'flex' : 'none'; };
    document.body.appendChild(tb);
  }

  function section(parent, title) {
    var wrap = mk('div', null, parent);
    css(wrap, { marginBottom: '12px' });
    var t = mk('div', { textContent: title }, wrap);
    css(t, { fontSize: '9px', letterSpacing: '2px', color: '#4a6080', borderBottom: '1px solid rgba(68,136,255,0.1)', paddingBottom: '6px', marginBottom: '8px' });
    return wrap;
  }

  function metric(parent, id, val, label) {
    var box = mk('div', null, parent);
    css(box, { background: 'rgba(68,136,255,0.06)', border: '1px solid rgba(68,136,255,0.12)', borderRadius: '6px', padding: '8px', textAlign: 'center' });
    mk('div', { id: id, textContent: val, style: 'font-size:18px;font-weight:700;color:#4488ff;line-height:1' }, box);
    mk('div', { textContent: label, style: 'font-size:9px;color:#4a6080;margin-top:3px;letter-spacing:1px' }, box);
  }

  function styleSelect(el) {
    css(el, { width: '100%', background: '#0a1020', color: '#c8d8f0', border: '1px solid rgba(68,136,255,0.2)', padding: '5px', borderRadius: '4px', fontFamily: 'inherit', marginBottom: '4px' });
  }

  function upd(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

  function updMetrics() {
    upd('fv8-tok', F.tokens > 999 ? Math.floor(F.tokens / 1000) + 'K' : F.tokens);
    upd('fv8-jobs', F.jobs);
    upd('fv8-evts', F.events.length);
    var m = Math.floor((Date.now() - F.started) / 60000);
    upd('fv8-up', m > 60 ? Math.floor(m / 60) + 'h' : m + 'm');
  }

  function renderProjects() {
    var el = document.getElementById('fv8-proj');
    if (!el) return;
    if (!F.projects.length) { el.textContent = 'No projects loaded'; return; }
    el.innerHTML = '';
    F.projects.slice(0, 3).forEach(function (p) {
      var id = p.projectId || p.id || 'fenix-os';
      var cfg = PROJ[id] || { label: id, icon: id[0].toUpperCase(), color: '#4488ff' };
      var card = mk('div', null, el);
      css(card, { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px', marginBottom: '6px', cursor: 'pointer' });
      if (F.activeProject === id) css(card, { borderColor: 'rgba(68,136,255,0.4)', background: 'rgba(68,136,255,0.06)' });
      card.onclick = function () { F.selectProject(id); };
      var row = mk('div', null, card);
      css(row, { display: 'flex', alignItems: 'center', gap: '8px' });
      var ico = mk('div', { textContent: cfg.icon }, row);
      css(ico, { width: '26px', height: '26px', borderRadius: '6px', background: cfg.color + '22', color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: '0' });
      var info = mk('div', null, row);
      mk('div', { textContent: cfg.label, style: 'font-size:11px;font-weight:600' }, info);
      var fi = (p.metrics && p.metrics.totalFiles) ? p.metrics.totalFiles + ' files' : p.status || 'active';
      mk('div', { textContent: fi, style: 'font-size:9px;color:#4a6080' }, info);
    });
  }

  function addEvent(ev) {
    F.events.unshift(ev);
    if (F.events.length > 50) F.events.pop();
    var el = document.getElementById('fv8-evlist');
    if (!el) return;
    var t = ev.type || '?';
    var co = t.indexOf('job') >= 0 ? '#f39c12' : t.indexOf('agent') >= 0 ? '#2ecc71' : t.indexOf('project') >= 0 ? '#9b59b6' : '#4488ff';
    var row = mk('div', null, null);
    css(row, { padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '10px' });
    row.innerHTML = '<span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:9px;background:' + co + '22;color:' + co + '">' + t + '</span>';
    el.insertBefore(row, el.firstChild);
    while (el.children.length > 15) el.removeChild(el.lastChild);
    updMetrics();
  }

  function connectSSE() {
    if (F.sse) { try { F.sse.close(); } catch (e) { } }
    try {
      var es = new EventSource('/api/v2/events/stream');
      F.sse = es;
      es.onmessage = function (e) {
        try {
          var ev = JSON.parse(e.data);
          if (ev.type === 'heartbeat') return;
          addEvent(ev);
          if (ev.type.indexOf('job') >= 0 && ev.type !== 'job.failed') F.jobs++;
          if (ev.data && ev.data.tokens) F.tokens += (ev.data.tokens || 0);
        } catch (err) { }
      };
      es.onerror = function () { setTimeout(connectSSE, 5000); };
    } catch (e) { console.warn('[FenixV8] SSE:', e.message); }
  }

  function loadProjects() {
    fetch('/api/v2/public/projects', { signal: AbortSignal.timeout(10000) })
      .then(function (r) { return r.json(); })
      .then(function (d) { F.projects = d.projects || []; renderProjects(); })
      .catch(function () { var el = document.getElementById('fv8-proj'); if (el) el.textContent = 'API loading...'; });
  }

  function enqJob() {
    var ty = document.getElementById('fv8-type').value;
    var pr = document.getElementById('fv8-psel').value;
    var re = document.getElementById('fv8-res');
    if (re) re.textContent = 'Enqueueing...';
    var tok = window._fenixToken || '';
    fetch('/api/v2/jobs/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ type: ty, projectId: pr, payload: { query: 'Quick ' + ty + ' of ' + pr } })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (re) re.textContent = d.ok ? 'Job #' + d.jobId + ' queued!' : (d.error || 'Check auth');
    }).catch(function (e) { if (re) re.textContent = 'Error: ' + e.message.slice(0, 40); });
  }

  F.selectProject = function (id) {
    F.activeProject = id;
    renderProjects();
    addEvent({ type: 'project.selected', timestamp: new Date().toISOString(), data: { projectId: id } });
  };

  function init() {
    panel();
    connectSSE();
    loadProjects();
    setInterval(updMetrics, 30000);
    setInterval(loadProjects, 60000);
    console.log('[FenixV8] V8 Panel initialized');
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { setTimeout(init, 500); }
})();
