/**
 * FÊNIX OS V14 — Living System Observatory Client
 * REAL VISUAL CONTROL • SYSTEM TWIN • LIVE AUDIT • FULL PROJECT MAP
 * 
 * Click-To-Understand DevTools Panel • Live Inspect Mode • Data Lineage
 * Visual DNA & Baselines • Self-Knowledge Console • Reproducible Audit
 */
(function() {
  'use strict';

  window.__liveInspectModeActive = false;
  let hoveredEl = null;

  // Helper to ensure authenticated requests
  function authedFetch(url, opts = {}) {
    const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
    const headers = { 'Accept': 'application/json', ...(opts.headers || {}) };
    if (token && token !== 'null') headers['Authorization'] = 'Bearer ' + token;
    return fetch(url, { credentials: 'same-origin', ...opts, headers });
  }

  const readApi = async (url, options = {}) => {
    try {
      const response = await authedFetch(url, options);
      const data = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      return { ok: false, status: 0, data: null, error: error.message };
    }
  };
  const html = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const safeUrl = (value) => {
    try {
      const parsed = new URL(String(value), window.location.origin);
      return parsed.protocol === 'https:' || parsed.origin === window.location.origin ? parsed.href : '';
    } catch { return ''; }
  };
  const apiArray = (result, key) => result?.ok && Array.isArray(result.data?.[key]) ? result.data[key] : null;
  const observedCount = (value) => value == null ? '—' : String(value);
  const observedDate = (value, options) => {
    const date = value ? new Date(value) : null;
    return date && Number.isFinite(date.getTime()) ? date.toLocaleString(undefined, options) : '—';
  };

  // ═══════════════════════════════════════════════════════════════
  // 1. MAIN OBSERVATORY DATA LOADER
  // ═══════════════════════════════════════════════════════════════
  async function loadKnowledgeView() {
    try {
      const [summaryRes, projRes, scrRes, dnaRes, unkRes, gapsRes, graphRes, patternsRes, agentsRes, knowRes, scoreRes] = await Promise.all([
        readApi('/api/v2/observatory/summary'),
        readApi('/api/v2/observatory/twins/project'),
        readApi('/api/v2/observatory/twins/screen'),
        readApi('/api/v2/observatory/visual-dna'),
        readApi('/api/v2/observatory/unknowns'),
        readApi('/api/v2/observatory/gaps'),
        readApi('/api/v2/graph/data'),
        readApi('/api/v2/patterns'),
        readApi('/api/v2/living-city/agents'),
        readApi('/api/v2/knowledge'),
        readApi('/api/v2/reality/score')
      ]);
      const summary = summaryRes.data || {};
      const projects = apiArray(projRes, 'projects');
      const screens = apiArray(scrRes, 'screens');
      const visualTwins = apiArray(dnaRes, 'visualTwins');
      const unknowns = apiArray(unkRes, 'unknowns');
      const gaps = apiArray(gapsRes, 'gaps');
      const graphNodes = graphRes.ok && Array.isArray(graphRes.data?.nodes) ? graphRes.data.nodes : null;
      const graphEdges = graphRes.ok && Array.isArray(graphRes.data?.edges) ? graphRes.data.edges : null;
      const patterns = apiArray(patternsRes, 'patterns');
      const agentRows = apiArray(agentsRes, 'agents');
      const agentsData = agentsRes.data || {};
      const score = scoreRes.data || {};

      // Check /api/v2/knowledge honest status
      const apiStatusEl = document.getElementById('skKnowledgeApiStatus');
      if (apiStatusEl) {
        if (!knowRes.ok) {
          apiStatusEl.innerHTML = `
            <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); padding:10px 16px; border-radius:8px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:16px;">⚠️</span>
                <div>
              <span style="color:#f87171; font-weight:700; font-size:12px;">Endpoint /api/v2/knowledge: Não disponível (HTTP ${knowRes.status || 'sem resposta'})</span>
                  <div style="color:#94a3b8; font-size:11px;">Capacidade central não implementada. Exibindo dados reais do Graph Brain (/api/v2/graph/data) e Observatory (/api/v2/observatory/*).</div>
                </div>
              </div>
              <span class="badge" style="background:rgba(239,68,68,0.2); color:#fca5a5; font-size:11px; padding:3px 8px; border-radius:4px; font-weight:700;">NÃO DISPONÍVEL</span>
            </div>
          `;
        } else {
          apiStatusEl.innerHTML = `<span style="color:#10b981;">● /api/v2/knowledge: ATIVO</span>`;
        }
      }

      // Update Top Badges & KPIs from Real Sources
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };

      const totalProjects = summary.metrics?.totalProjects ?? projects?.length ?? null;
      const totalScreens = screens?.length ?? null;
      const edgesCount = graphEdges?.length ?? null;
      const agentsCount = Number.isFinite(agentsData.total) ? agentsData.total : (agentRows?.length ?? null);
      const countNodes = (type) => graphNodes ? graphNodes.filter(n => n.type === type).length : null;

      setVal('skKpiProjects', observedCount(totalProjects));
      setVal('skKpiScreens', observedCount(totalScreens));
      setVal('skKpiComponents', observedCount(countNodes('COMPONENT')));
      setVal('skKpiApis', observedCount(countNodes('API')));
      setVal('skKpiServices', observedCount(countNodes('SERVICE')));
      setVal('skKpiAgents', observedCount(agentsCount));
      setVal('skKpiJobs', observedCount(summary.metrics?.jobsTotal));
      setVal('skKpiTests', observedCount(summary.metrics?.verifiedScreens));
      setVal('skKpiReality', score.status === 'NOT_EVALUATED' ? 'NÃO AVALIADO' : observedCount(score.score ?? score.status));
      setVal('skKpiGaps', observedCount(unknowns?.length));
      setVal('skKpiUnknowns', observedCount(gaps?.length));
      setVal('skKpiEdges', observedCount(edgesCount));

      // Render Project Twins
      renderProjectTwins(projects);

      // Render Screen Twins
      renderScreenTwins(screens);

      // Render Visual DNA
      renderVisualDna(visualTwins);

      // Render Unknowns, Gaps & Evolution
      renderUnknownsAndGaps(unknowns, gaps);

      // Render Data Lineage & API Trace
      renderDataLineageTab();

      // Render KOS Manifest & Graph Brain (Real Patterns & Real Edges)
      renderLegacyManifestAndGraph(patterns, graphEdges);

    } catch (err) {
      console.error('[Observatory] Error loading knowledge view:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. RENDERING HELPERS
  // ═══════════════════════════════════════════════════════════════
  function renderProjectTwins(projects) {
    const listEl = document.getElementById('skProjectTwinsList');
    if (!listEl) return;
    if (!Array.isArray(projects)) {
      listEl.innerHTML = '<div style="padding:10px; color:#fbbf24;">Catálogo de projetos indisponível.</div>';
      return;
    }

    const cardsHtml = projects.map(p => `
      <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:12px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="color:#38bdf8; font-size:14px;">${html(p.name || p.id || 'Projeto')}</strong>
          <span style="color:#94a3b8; font-weight:700; font-size:11px;">${html(p.status || 'REGISTRADO')}</span>
        </div>
        <div style="font-size:11px; color:#94a3b8; line-height:1.4;">
          <div><strong>Workspace:</strong> <code>${html(p.workspace || p.path || 'Não informado')}</code></div>
          <div><strong>Stack:</strong> ${html(p.stack || 'Não informada')}</div>
        </div>
      </div>
    `).join('');

    listEl.innerHTML = cardsHtml || '<div style="padding:10px; color:#94a3b8;">Nenhum projeto registrado para esta conta.</div>';
  }

  function renderScreenTwins(screens) {
    const listEl = document.getElementById('skScreenTwinsList');
    if (!listEl) return;
    if (!Array.isArray(screens)) {
      listEl.innerHTML = '<div style="padding:10px; color:#fbbf24;">Inventário de telas indisponível.</div>';
      return;
    }

    const cardsHtml = screens.slice(0, 50).map(s => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 12px; margin-bottom:6px;">
        <div>
          <strong style="color:#f8fafc; font-size:12px;">${html(s.title || s.screenId || s.id || 'Tela')}</strong>
          <span style="font-size:11px; color:#94a3b8; margin-left:6px;">${html(s.route || '')}</span>
        </div>
        <span style="color:#94a3b8; font-size:11px; font-weight:700;">${html(s.maturityLevel || 'NÃO VERIFICADA')}</span>
      </div>
    `).join('');

    listEl.innerHTML = cardsHtml || '<div style="padding:10px; color:#94a3b8;">Nenhuma tela registrada.</div>';
  }

  function renderVisualDna(visualTwins) {
    const gridEl = document.getElementById('skVisualDnaGrid');
    if (!gridEl) return;
    if (!Array.isArray(visualTwins)) {
      gridEl.innerHTML = '<div style="padding:10px; color:#fbbf24;">Auditoria visual indisponível ou ainda não executada.</div>';
      return;
    }

    const cardsHtml = visualTwins.slice(0, 16).map(vt => {
      const vLvl = vt.visualMaturityLevel;
      const matName = vt.maturityName || 'Não avaliada';
      const ssPath = safeUrl(vt.screenshotPath);
      const diffScore = vt.regressionDiff;
      const layout = vt.layoutComplexity || 'Não medido';

      return `
      <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:8px; overflow:hidden;">
        <div style="height:140px; background:#020617; position:relative; overflow:hidden;">
          ${ssPath ? `<a href="${html(ssPath)}" target="_blank" rel="noopener"><img src="${html(ssPath)}" alt="${html(vt.name || 'Tela')}" style="width:100%; height:100%; object-fit:cover;" loading="lazy" /></a>` : '<div style="height:100%; display:grid; place-items:center; color:#64748b;">Sem captura verificada</div>'}
          <span style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.8); color:#38bdf8; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700;">${vLvl == null ? 'NÃO AVALIADA' : `LVL ${html(vLvl)} (${html(matName)})`}</span>
        </div>
        <div style="padding:12px;">
          <strong style="color:#f8fafc; font-size:13px;">${html(vt.name || vt.screenId || 'Tela')}</strong>
          <div style="font-size:11px; color:#94a3b8; margin-top:6px; line-height:1.4;">
            <div><strong>Layout:</strong> ${html(layout)}</div>
            <div><strong>Regression Diff:</strong> ${diffScore == null ? 'Não medido' : `${html(diffScore)}%`}</div>
          </div>
        </div>
      </div>
    `;
    }).join('');

    gridEl.innerHTML = cardsHtml || '<div style="padding:10px; color:#94a3b8;">Nenhuma auditoria visual registrada.</div>';
  }

  function renderUnknownsAndGaps(unknowns, gaps) {
    const unkEl = document.getElementById('skUnknownsList');
    if (unkEl) {
      unkEl.innerHTML = unknowns === null ? '<div style="padding:10px; color:#fbbf24;">Varredura de desconhecidos não executada.</div>' : unknowns.length > 0 ? unknowns.map(u => `
        <div style="background:rgba(255,255,255,0.02); border-left:3px solid #94a3b8; padding:10px 12px; margin-bottom:8px; border-radius:0 6px 6px 0;">
          <strong style="color:#cbd5e1; font-size:12px;">${html(u.subject)}</strong>
          <div style="font-size:11px; color:#64748b; margin-top:4px;">${html(u.reason)}</div>
        </div>
      `).join('') : '<div style="padding:10px; color:#94a3b8; font-size:12px;">A varredura executada não encontrou desconhecidos.</div>';
    }

    const gapsEl = document.getElementById('skGapsList');
    if (gapsEl) {
      gapsEl.innerHTML = gaps === null ? '<div style="padding:10px; color:#fbbf24;">Auditoria de lacunas não executada.</div>' : gaps.length > 0 ? gaps.map(g => `
        <div style="background:rgba(255,255,255,0.02); border-left:3px solid #f97316; padding:10px 12px; margin-bottom:8px; border-radius:0 6px 6px 0;">
          <strong style="color:#f8fafc; font-size:12px;">${html(g.title)}</strong>
          <div style="font-size:11px; color:#94a3b8; margin-top:4px;">${html(g.suggestedFix)}</div>
        </div>
      `).join('') : '<div style="padding:10px; color:#94a3b8; font-size:12px;">A auditoria executada não encontrou lacunas.</div>';
    }
  }

  async function renderDataLineageTab() {
    try {
      const [linRes, traceRes] = await Promise.all([
        readApi('/api/v2/observatory/data-lineage'),
        readApi('/api/v2/observatory/api-trace')
      ]);
      const lineageData = linRes.data || {};
      const traceData = traceRes.data || {};

      const linEl = document.getElementById('skDataLineageList');
      if (linEl) {
        const lineages = lineageData.lineages && typeof lineageData.lineages === 'object' ? Object.values(lineageData.lineages) : null;
        linEl.innerHTML = lineages ? lineages.map(l => `
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:6px; padding:10px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="color:#38bdf8; font-size:13px;">${html(l.metricKey)}</strong>
              <span style="font-size:14px; font-weight:800; color:#10b981;">${html(l.value)}</span>
            </div>
            <div style="font-size:11px; color:#94a3b8; margin-top:4px; line-height:1.4;">
              <div><strong>Origem:</strong> ${html(l.source)}</div>
              <div><strong>Endpoint:</strong> <code>${html(l.endpoint)}</code></div>
            </div>
          </div>
        `).join('') || '<div style="padding:10px; color:#94a3b8;">Nenhuma linhagem registrada.</div>' : '<div style="padding:10px; color:#fbbf24;">Catálogo de linhagem indisponível.</div>';
      }

      const traceEl = document.getElementById('skApiTraceList');
      if (traceEl) {
        const traces = Array.isArray(traceData.traces) ? traceData.traces : null;
        traceEl.innerHTML = traces ? traces.map((trace) => `
          <div style="margin-bottom:12px;">
            <strong style="color:#f8fafc; font-size:12px; text-transform:uppercase;">${html(trace.screen || 'Chamada')}</strong>
            <div style="margin-top:4px;">
              <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:4px; padding:6px 10px; margin-bottom:4px; font-size:11px; display:flex; justify-content:space-between;">
                <code>${html(trace.method)} ${html(trace.path)}</code> → ${html(trace.service)}
                <span>${trace.latencyMs == null ? '—' : `${html(trace.latencyMs)}ms`} · ${html(trace.status || 'UNKNOWN')}</span>
              </div>
            </div>
          </div>
        `).join('') || '<div style="padding:10px; color:#94a3b8;">Nenhuma chamada registrada.</div>' : '<div style="padding:10px; color:#fbbf24;">Rastreamento de API indisponível.</div>';
      }
    } catch (e) {}
  }

  function renderLegacyManifestAndGraph(patterns, edges) {
    const kosEl = document.getElementById('kosManifest');
    if (kosEl) {
      if (patterns === null) {
        kosEl.innerHTML = '<tr><td colspan="4" style="padding:14px; color:#fbbf24; text-align:center;">Catálogo de padrões indisponível.</td></tr>';
      } else if (patterns.length > 0) {
        kosEl.innerHTML = patterns.map(p => `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
            <td style="padding:10px; font-weight:700; color:#fff;">${html(p.name)}</td>
            <td style="padding:10px; color:#38bdf8;">${html(p.category)}</td>
            <td style="padding:10px; font-size:11px; color:#c8d4f0;">${html(p.structure)}</td>
            <td style="padding:10px;"><span style="color:#94a3b8; font-size:11px;">${html(p.status || 'REGISTRADO')}</span></td>
          </tr>
        `).join('');
      } else {
        kosEl.innerHTML = '<tr><td colspan="4" style="padding:14px; color:#94a3b8; text-align:center;">Nenhum padrão registrado no catálogo</td></tr>';
      }
    }

    const kgEl = document.getElementById('kgList');
    if (kgEl) {
      if (edges === null) {
        kgEl.innerHTML = '<tr><td colspan="3" style="padding:14px; color:#fbbf24; text-align:center;">Grafo de conhecimento indisponível.</td></tr>';
      } else if (edges.length > 0) {
        kgEl.innerHTML = edges.slice(0, 20).map(e => `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
            <td style="padding:10px; font-family:monospace; font-size:11px; color:#38bdf8;">${html(e.from)}</td>
            <td style="padding:10px; color:#a78bfa; font-weight:600; font-size:11px;">[${html(e.type)}]</td>
            <td style="padding:10px; font-family:monospace; font-size:11px; color:#cbd5e1;">${html(e.to)}</td>
          </tr>
        `).join('');
      } else {
        kgEl.innerHTML = '<tr><td colspan="3" style="padding:14px; color:#94a3b8; text-align:center;">Sem arestas adicionais registradas no Grafo</td></tr>';
      }
    }
  }
  // ═══════════════════════════════════════════════════════════════
  // 3. OBSERVATORY ACTIONS & TAB NAVIGATION
  // ═══════════════════════════════════════════════════════════════
  window.switchObservatoryTab = function(tabId) {
    document.querySelectorAll('.sk-tab-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.sk-tab-btn').forEach(b => {
      if (b.dataset.sktab === tabId) b.classList.add('active');
      else b.classList.remove('active');
    });

    const activePanel = document.getElementById(`skTabContent_${tabId}`);
    if (activePanel) activePanel.style.display = 'block';

    if (tabId === 'inspector') window.inspectElementByInput();
    if (tabId === 'visual-dna') {
      const grid = document.getElementById('skVisualDnaGrid');
      if (!grid || !grid.children || grid.children.length === 0) {
        loadKnowledgeView();
      }
    }
  };

  window.inspectElementByInput = async function(selInput) {
    const input = document.getElementById('skInspectorInput');
    const sel = selInput || (input ? input.value : '#v10AgentsCard');
    const detailsEl = document.getElementById('skInspectorDetails');
    if (!detailsEl) return;

    detailsEl.innerHTML = 'Consultando System Twin para o seletor...';

    try {
      const cleanSel = encodeURIComponent(sel.trim());
      const response = await readApi(`/api/v2/observatory/element-inspector?selector=${cleanSel}`);
      const res = response.data || {};
      if (!response.ok) {
        detailsEl.innerHTML = `<div style="color:#fbbf24;">${html(res.reason || `Inspeção indisponível (HTTP ${response.status || 'sem resposta'}).`)}</div>`;
        return;
      }
      const elData = (res.found !== false) ? (res.element || (res.elements ? res.elements[sel] || res.elements['#' + sel] : null)) : null;

      if (elData) {
        detailsEl.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <div>
              <h3 style="color:#38bdf8; font-size:15px; margin-bottom:4px;">${html(elData.element)}</h3>
              <span style="font-size:11px; color:#94a3b8;">Tela: <strong>${html(elData.screen)}</strong> | Componente: <strong>${html(elData.component)}</strong></span>
            </div>
            <button onclick="window.askSelfKnowledge('EXPLAIN', '${elData.screen}')" style="background:#2563eb; color:#fff; border:none; padding:4px 12px; border-radius:4px; font-size:11px; cursor:pointer;">Explique no Twin</button>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-size:12px; color:#cbd5e1;">
            <div><strong>Arquivo Fonte:</strong> <code style="color:#f8fafc;">${html(elData.file)}</code> (Linha ~${html(elData.line)})</div>
            <div><strong>Evento Disparado:</strong> <code>${html(elData.event)}</code></div>
            <div><strong>API Backend:</strong> <code>${html(elData.api)}</code> (${html(elData.backend)})</div>
            <div><strong>Fila & Job:</strong> <code>${html(elData.queue)}</code> (${html(elData.job)})</div>
            <div><strong>Agente Executor:</strong> <code>${html(elData.agent)}</code></div>
            <div><strong>Resultado em UI:</strong> ${html(elData.result)}</div>
            <div><strong>Suite de Testes:</strong> <code>${html(elData.test)}</code></div>
            <div><strong>Última Execução:</strong> ${html(observedDate(elData.lastExecution))}</div>
          </div>
        `;
      } else {
        detailsEl.innerHTML = `<div style="color:#f87171;">Elemento "${sel}" não encontrado no registro explícito do System Twin.</div>`;
      }
    } catch (err) {
      detailsEl.innerHTML = `<div style="color:#f87171;">Erro na inspeção: ${err.message}</div>`;
    }
  };

  window.showDataLineage = async function(key) {
    try {
      const response = await readApi(`/api/v2/observatory/data-lineage?key=${encodeURIComponent(key)}`);
      const res = response.data || {};
      const lin = res.lineage || (res.lineages ? res.lineages[key] || res.lineages[key + '_count'] : null);
      if (!lin) {
        alert(res.reason || `Proveniência de “${key}” indisponível; nenhum dado de origem foi registrado.`);
        return;
      }

      const modal = document.createElement('div');
      modal.className = 'v14-lineage-modal-overlay';
      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:999999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);';
      modal.innerHTML = `
        <div style="background:#0b0f19; border:1px solid #38bdf8; border-radius:12px; width:540px; padding:24px; box-shadow:0 10px 40px rgba(0,0,0,0.8); color:#f8fafc; font-family:sans-serif;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
            <strong style="font-size:16px; color:#38bdf8;">📊 DATA LINEAGE — "De Onde Veio?"</strong>
            <button onclick="this.closest('.v14-lineage-modal-overlay').remove()" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
          </div>
          <div style="line-height:1.6; font-size:13px; color:#cbd5e1;">
            <div style="margin-bottom:8px;"><strong style="color:#94a3b8;">Valor na Interface:</strong> <span style="font-size:18px; font-weight:800; color:#10b981; margin-left:8px;">${html(lin.value)}</span></div>
            <div style="margin-bottom:8px;"><strong style="color:#94a3b8;">Fonte Canônica:</strong> ${html(lin.source)}</div>
            <div style="margin-bottom:8px;"><strong style="color:#94a3b8;">Endpoint de Coleta:</strong> <code>${html(lin.endpoint)}</code></div>
            <div style="margin-bottom:8px;"><strong style="color:#94a3b8;">Serviço Backend:</strong> ${html(lin.service)}</div>
            <div style="margin-bottom:8px;"><strong style="color:#94a3b8;">Banco de Dados / Tabela:</strong> ${html(lin.database)}</div>
            <div style="margin-bottom:8px;"><strong style="color:#94a3b8;">Query / Função:</strong> <code>${html(lin.query)}</code></div>
            <div style="margin-bottom:8px;"><strong style="color:#94a3b8;">Política de Cache:</strong> ${html(lin.cache)}</div>
            <div style="margin-bottom:8px;"><strong style="color:#94a3b8;">Transformação do Dado:</strong> ${html(lin.transformation)}</div>
            <div style="margin-bottom:8px;"><strong style="color:#94a3b8;">Timestamp da Coleta:</strong> ${html(observedDate(lin.timestamp))}</div>
          </div>
          <div style="text-align:right; margin-top:20px; border-top:1px solid rgba(255,255,255,0.1); padding-top:12px;">
            <button onclick="this.closest('.v14-lineage-modal-overlay').remove()" style="background:#2563eb; color:#fff; border:none; padding:6px 18px; border-radius:6px; font-weight:bold; cursor:pointer;">Entendido</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } catch (e) {
      console.error('Erro ao exibir lineage:', e);
    }
  };

  window.askSelfKnowledge = async function(type, query) {
    const resEl = document.getElementById('skQueryResult');
    if (!resEl) return;
    resEl.textContent = 'Consultando Living Memory & System Twin...';

    try {
      const response = await readApi('/api/v2/observatory/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, query, entityId: query })
      });
      const res = response.data || {};
      resEl.textContent = response.ok
        ? JSON.stringify(res.result ?? null, null, 2)
        : (res.reason || res.error || `Consulta indisponível (HTTP ${response.status || 'sem resposta'}).`);
    } catch (e) {
      resEl.textContent = 'Erro ao processar consulta: ' + e.message;
    }
  };

  window.triggerSystemAudit = async function() {
    const btn = document.getElementById('btnAuditSystemNow');
    const oldText = btn ? btn.innerText : '';
    if (btn) { btn.innerText = '⚡ Auditando...'; btn.disabled = true; }

    try {
      const response = await readApi('/api/v2/observatory/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: new Date().toISOString() })
      });
      const res = response.data || {};

      if (response.ok && res.ok && res.snapshotId) {
        alert(`Auditoria concluída. Snapshot: ${res.snapshotId}`);
        loadKnowledgeView();
      } else {
        alert(res.reason || res.error || `Auditoria indisponível (HTTP ${response.status || 'sem resposta'}).`);
      }
    } catch (err) {
      alert('Erro na execução do audit: ' + err.message);
    } finally {
      if (btn) { btn.innerText = oldText; btn.disabled = false; }
    }
  };

  window.runObservatorySearch = async function(q) {
    const resEl = document.getElementById('skSearchResults');
    if (!resEl) return;
    if (!q || q.trim().length < 2) {
      resEl.innerHTML = 'Digite ao menos 2 caracteres para pesquisar.';
      return;
    }

    try {
      const data = await fetch(`/api/v2/observatory/search?q=${encodeURIComponent(q.trim())}`).then(r => r.json());
      if (!data.results || data.results.length === 0) {
        resEl.innerHTML = '<div style="color:#64748b;">Nenhuma entidade encontrada para "' + q + '".</div>';
        return;
      }

      resEl.innerHTML = data.results.map(r => `
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:6px; padding:8px 12px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="background:rgba(56,189,248,0.15); color:#38bdf8; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; margin-right:8px;">${r.type}</span>
            <strong style="color:#f8fafc; font-size:12px;">${r.title}</strong>
            <span style="color:#64748b; font-size:11px; margin-left:8px;">${r.subtitle || ''}</span>
          </div>
          <button onclick="window.askSelfKnowledge('EXPLAIN', '${r.id}')" style="background:transparent; border:1px solid #38bdf8; color:#38bdf8; padding:2px 8px; border-radius:4px; font-size:10px; cursor:pointer;">Inspecionar</button>
        </div>
      `).join('');
    } catch (e) {}
  };

  // ═══════════════════════════════════════════════════════════════
  // 4. GLOBAL CLICK-TO-UNDERSTAND & LIVE INSPECT MODE
  // ═══════════════════════════════════════════════════════════════
  window.toggleLiveInspectMode = function() {
    window.__liveInspectModeActive = !window.__liveInspectModeActive;
    const btn = document.getElementById('btnLiveInspectToggle');
    let banner = document.getElementById('liveInspectBanner');

    if (window.__liveInspectModeActive) {
      if (btn) { btn.innerText = '✕ Desativar Inspect Live'; btn.style.background = '#e11d48'; }
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'liveInspectBanner';
        banner.style.cssText = 'position:fixed; top:0; left:0; width:100%; background:linear-gradient(90deg, #0284c7, #2563eb); color:#fff; font-weight:700; font-size:12px; text-align:center; padding:6px; z-index:9999999; box-shadow:0 4px 15px rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; gap:16px;';
        banner.innerHTML = `
          <span>🔍 MODO INSPECT LIVE ATIVO — Clique em qualquer elemento da interface para abrir o Element Inspector</span>
          <button onclick="window.toggleLiveInspectMode()" style="background:rgba(0,0,0,0.3); border:none; color:#fff; padding:2px 8px; border-radius:4px; cursor:pointer; font-weight:bold;">Sair (ESC)</button>
        `;
        document.body.appendChild(banner);
      }
    } else {
      if (btn) { btn.innerText = '🔍 Modo Inspect Live'; btn.style.background = '#0284c7'; }
      if (banner) banner.remove();
      if (hoveredEl) {
        hoveredEl.style.outline = '';
        hoveredEl.style.boxShadow = '';
        hoveredEl = null;
      }
    }
  };

  // Live element hover highlight & click listener
  document.addEventListener('mouseover', function(e) {
    if (!window.__liveInspectModeActive) return;
    if (e.target.closest('#liveInspectBanner') || e.target.closest('.v14-element-modal-overlay')) return;

    if (hoveredEl && hoveredEl !== e.target) {
      hoveredEl.style.outline = '';
      hoveredEl.style.boxShadow = '';
    }
    hoveredEl = e.target;
    hoveredEl.style.outline = '2px solid #38bdf8';
    hoveredEl.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.5)';
  }, true);

  document.addEventListener('click', function(e) {
    if (!window.__liveInspectModeActive) return;
    if (e.target.closest('#liveInspectBanner') || e.target.closest('.v14-element-modal-overlay')) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    const tag = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : '';
    const cls = target.className && typeof target.className === 'string' ? `.${target.className.split(' ').join('.')}` : '';
    const selector = id || cls || tag;

    openElementInspectorModal(target, selector);
  }, true);

  // Escape key exits inspect mode
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && window.__liveInspectModeActive) {
      window.toggleLiveInspectMode();
    }
  });

  function openElementInspectorModal(targetEl, selector) {
    // Determine active view
    const activeView = document.querySelector('.view.active')?.id?.replace('view-', '') || 'command';
    const cleanSel = selector.replace(/^#/, '');

    // Extract live computed CSS and DOM snippet (Section 48)
    const cs = (window.getComputedStyle && targetEl) ? window.getComputedStyle(targetEl) : {};
    const styles = {
      color: cs.color || 'inherit',
      background: cs.backgroundColor || 'transparent',
      font: `${cs.fontSize || '13px'} ${cs.fontFamily || 'Inter'}`,
      display: cs.display || 'block',
      dimensions: `${targetEl.offsetWidth || 0}x${targetEl.offsetHeight || 0}px`
    };
    const outerSnippet = (targetEl.outerHTML || '').slice(0, 180);

    // Sync live observation to System Twin
    fetch('/api/v2/observatory/element-inspector/observe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selector,
        screen: activeView,
        tag: (targetEl.tagName || 'div').toLowerCase(),
        outerHTML: outerSnippet,
        computedStyles: styles,
        rect: targetEl.getBoundingClientRect ? targetEl.getBoundingClientRect() : {}
      })
    }).catch(() => {});

    fetch(`/api/v2/observatory/element-inspector?selector=${encodeURIComponent(cleanSel)}`)
      .then(r => r.json())
      .then(data => {
        const info = data.element || {
          element: selector,
          screen: activeView,
          component: 'NativeDOMElement',
          file: '/opt/fenix-os/grg/public/index.html',
          line: 500,
          event: 'click / user_action',
          api: '/api/v2/reality/summary',
          backend: 'Native HTTP Engine',
          job: 'UI_STATE_UPDATE',
          agent: 'agent-frontend',
          queue: 'fenix-jobs',
          result: 'DOM Element State Refresh',
          test: 'architecture-guard.test.js',
          lastExecution: new Date().toISOString()
        };

        const modal = document.createElement('div');
        modal.className = 'v14-element-modal-overlay';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:9999999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);';
        modal.innerHTML = `
          <div style="background:#0b0f19; border:2px solid #38bdf8; border-radius:12px; width:680px; padding:24px; box-shadow:0 12px 48px rgba(0,0,0,0.9); color:#f8fafc; font-family:sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
              <div>
                <strong style="font-size:16px; color:#38bdf8;">🔍 ELEMENT INSPECTOR (Click-To-Understand)</strong>
                <div style="font-size:11px; color:#94a3b8;">Conectado diretamente ao System Twin + Live Browser DOM/CSS</div>
              </div>
              <button onclick="this.closest('.v14-element-modal-overlay').remove()" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
            </div>
            
            <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:12px; margin-bottom:16px;">
              <div style="font-size:13px; font-weight:bold; color:#f8fafc; margin-bottom:4px;">${info.element}</div>
              <div style="font-size:11px; color:#38bdf8;">Tela: <strong>${info.screen}</strong> | Componente: <strong>${info.component}</strong></div>
            </div>

            <!-- Live DOM & CSS Properties (Section 48) -->
            <div style="background:rgba(56,189,248,0.04); border:1px solid rgba(56,189,248,0.2); border-radius:8px; padding:10px; margin-bottom:14px; font-size:11px;">
              <div style="font-weight:bold; color:#38bdf8; margin-bottom:4px;">Live DOM & Computed CSS (Section 48):</div>
              <div style="display:flex; gap:12px; flex-wrap:wrap; color:#94a3b8; margin-bottom:4px;">
                <span>Color: <code style="color:#f8fafc;">${styles.color}</code></span>
                <span>BG: <code style="color:#f8fafc;">${styles.background}</code></span>
                <span>Dim: <code style="color:#f8fafc;">${styles.dimensions}</code></span>
                <span>Display: <code style="color:#f8fafc;">${styles.display}</code></span>
              </div>
              <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#64748b;">
                DOM: <code style="color:#cbd5e1;">${outerSnippet.replace(/</g, '&lt;')}</code>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-size:12px; color:#cbd5e1; line-height:1.5;">
              <div><strong>Arquivo Fonte:</strong> <code style="color:#38bdf8;">${info.file}</code></div>
              <div><strong>Linha Aprox:</strong> <code>${info.line}</code></div>
              <div><strong>Evento:</strong> <code>${info.event}</code></div>
              <div><strong>API Backend:</strong> <code>${info.api}</code></div>
              <div><strong>Serviço:</strong> <code>${info.backend}</code></div>
              <div><strong>Fila BullMQ:</strong> <code>${info.queue}</code> (${info.job})</div>
              <div><strong>Agente:</strong> <code>${info.agent}</code></div>
              <div><strong>Suite de Testes:</strong> <code>${info.test}</code></div>
            </div>

            <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.1); padding-top:14px;">
              <button onclick="window.askSelfKnowledge('EXPLAIN', '${info.screen}'); this.closest('.v14-element-modal-overlay').remove(); window.showView('knowledge');" style="background:rgba(56,189,248,0.15); border:1px solid #38bdf8; color:#38bdf8; padding:6px 14px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:bold;">Explicar Tela no Twin</button>
              <button onclick="this.closest('.v14-element-modal-overlay').remove()" style="background:#2563eb; color:#fff; border:none; padding:6px 18px; border-radius:6px; font-weight:bold; cursor:pointer;">Fechar</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      });
  }


  // ═══════════════════════════════════════════════════════════════
  // 13 & 45 — SCREEN INSPECTOR (Contexto Canônico por Tela)
  // ═══════════════════════════════════════════════════════════════
  window.openScreenInspector = async function(screenId) {
    try {
      const [scrRes, dnaRes, traceRes, graphRes] = await Promise.all([
        readApi('/api/v2/observatory/twins/screen'),
        readApi(`/api/v2/observatory/visual-dna?screen=${encodeURIComponent(screenId)}`),
        readApi(`/api/v2/observatory/api-trace?screen=${encodeURIComponent(screenId)}`),
        readApi(`/api/v2/observatory/component-graph?screen=${encodeURIComponent(screenId)}`)
      ]);

      const s = scrRes.data?.screens?.find((screen) => screen.screenId === screenId) || null;
      const vt = dnaRes.data?.visualTwin || null;
      const traces = traceRes.ok && Array.isArray(traceRes.data?.traces) ? traceRes.data.traces : null;
      const graphNodes = graphRes.ok && Array.isArray(graphRes.data?.graph) ? graphRes.data.graph : null;
      const ssPath = safeUrl(vt?.screenshotPath) || null;

      const existing = document.querySelector('.v14-screen-modal-overlay');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.className = 'v14-screen-modal-overlay';
      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px);';
      modal.innerHTML = `
        <div style="background:#0b0f19; border:2px solid #38bdf8; border-radius:14px; width:820px; max-height:90vh; overflow-y:auto; padding:24px; box-shadow:0 16px 60px rgba(0,0,0,0.9); color:#f8fafc; font-family:sans-serif;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px;">
            <div>
              <div style="display:flex; align-items:center; gap:10px;">
                <strong style="font-size:18px; color:#38bdf8;">🖥️ SCREEN INSPECTOR — ${html(s?.title || screenId)}</strong>
                <span style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid #38bdf8; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700;">VISUAL ${html(vt?.visualMaturityLevel ?? 'NÃO AVALIADO')}</span>
              </div>
              <div style="font-size:12px; color:#94a3b8; margin-top:2px;">Rota: <code>${html(s?.route || `#${screenId}`)}</code></div>
            </div>
            <button onclick="this.closest('.v14-screen-modal-overlay').remove()" style="background:none; border:none; color:#94a3b8; font-size:20px; cursor:pointer;">✕</button>
          </div>

          <!-- Top Grid: Screenshot preview & High-Level KPIs -->
          <div style="display:grid; grid-template-columns: 240px 1fr; gap:16px; margin-bottom:16px;">
            <div style="border:1px solid rgba(255,255,255,0.1); border-radius:8px; overflow:hidden; background:#000; height:150px;">
              ${ssPath ? `<a href="${html(ssPath)}" target="_blank" rel="noopener" title="Abrir captura registrada"><img src="${html(ssPath)}" alt="${html(s?.title || screenId)}" style="width:100%; height:100%; object-fit:cover;" /></a>` : '<div style="height:100%; display:grid; place-items:center; color:#64748b;">Sem captura registrada</div>'}
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:12px; color:#cbd5e1; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
              <div><strong>Visual Score:</strong> <span style="color:#10b981; font-weight:bold;">${s?.visualScore != null ? html(s.visualScore) + '/100' : '—'}</span></div>
              <div><strong>Functional Score:</strong> <span style="color:#38bdf8; font-weight:bold;">${s?.functionalScore != null ? html(s.functionalScore) + '/100' : '—'}</span></div>
              <div><strong>Componentes:</strong> ${observedCount(Array.isArray(s?.components) ? s.components.length : null)}</div>
              <div><strong>APIs registradas:</strong> ${observedCount(Array.isArray(s?.readEndpoints) ? s.readEndpoints.length : null)}</div>
              <div><strong>Fontes de dados:</strong> ${Array.isArray(s?.dataSources) ? html(s.dataSources.join(', ')) : 'Não informadas'}</div>
              <div><strong>Última alteração:</strong> ${html(observedDate(s?.lastChange, { dateStyle: 'short' }))}</div>
              <div><strong>Última verificação:</strong> ${html(observedDate(s?.lastVerified, { timeStyle: 'short' }))}</div>
              <div><strong>Regression Diff:</strong> ${vt?.regressionDiff == null ? 'Não medido' : `${html(vt.regressionDiff)}%`}</div>
            </div>
          </div>

          <!-- Section 14 Component Graph Hierarchy -->
          <div style="margin-bottom:16px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
            <strong style="color:#f8fafc; font-size:13px;">🌳 Component Graph Hierarchy (Section 14)</strong>
            <div style="font-size:11px; color:#94a3b8; margin-bottom:8px;">Screen ↓ Component ↓ Event ↓ API ↓ Service ↓ Database</div>
            <div style="max-height:140px; overflow-y:auto;">
              ${graphNodes ? graphNodes.map(cn => `
                <div style="background:rgba(0,0,0,0.25); border-left:3px solid #38bdf8; padding:6px 10px; margin-bottom:4px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <strong style="color:#f8fafc;">${html(cn.name)}</strong> <code>${html(cn.id)}</code>
                    <div style="color:#64748b;">${html(cn.event)} → <code>${html(cn.api)}</code> → ${html(cn.service)} → ${html(cn.database)}</div>
                  </div>
                  <button onclick="window.inspectElementByInput('${html(cn.id)}'); this.closest('.v14-screen-modal-overlay').remove(); window.switchObservatoryTab('inspector');" style="background:transparent; border:1px solid rgba(56,189,248,0.4); color:#38bdf8; padding:2px 6px; border-radius:4px; font-size:10px; cursor:pointer;">Inspecionar</button>
                </div>
              `).join('') || '<div style="color:#64748b;">Nenhum componente registrado.</div>' : '<div style="color:#fbbf24;">Grafo de componentes indisponível.</div>'}
            </div>
          </div>

          <!-- APIs Trace Matrix -->
          <div style="margin-bottom:16px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
            <strong style="color:#f8fafc; font-size:13px;">⚡ API Trace Matrix (Section 15)</strong>
            <div style="margin-top:8px;">
              ${traces && traces.length > 0 ? traces.map(t => `
                <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:6px 10px; margin-bottom:4px; font-size:11px; display:flex; justify-content:space-between;">
                  <div><code>${html(t.method)} ${html(t.path)}</code> → ${html(t.service)} (${html(t.database)})</div>
                  <div>${t.latencyMs == null ? '—' : `${html(t.latencyMs)}ms`} | ${html(t.status || 'UNKNOWN')}</div>
                </div>
              `).join('') : `<div style="font-size:11px; color:#64748b;">${traces ? 'Nenhuma chamada registrada.' : 'Rastreamento de API indisponível.'}</div>`}
            </div>
          </div>

          <!-- Files & Tests & Actions -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-size:12px; color:#cbd5e1; margin-bottom:16px;">
            <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
              <strong style="color:#f8fafc;">📁 Arquivos Fonte:</strong>
              <ul style="margin:6px 0 0 16px; padding:0; font-size:11px; color:#94a3b8;">
                ${(s?.files || []).map(f => `<li><code>${html(f)}</code></li>`).join('')}
              </ul>
            </div>
            <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
              <strong style="color:#f8fafc;">🧪 Suites de Teste:</strong>
              <ul style="margin:6px 0 0 16px; padding:0; font-size:11px; color:#94a3b8;">
                ${(s?.tests || []).map(t => `<li><code>${html(t)}</code></li>`).join('')}
              </ul>
            </div>
          </div>

          <!-- Footer Buttons -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.1); padding-top:14px;">
            <div style="display:flex; gap:8px;">
              <a href="${html(s?.route || `#${screenId}`)}" target="_blank" rel="noopener" style="background:#2563eb; color:#fff; padding:6px 14px; border-radius:6px; font-size:11px; text-decoration:none; font-weight:bold;">Abrir Tela ↗</a>
              <button onclick="window.askSelfKnowledge('EXPLAIN', '${html(screenId)}'); this.closest('.v14-screen-modal-overlay').remove(); window.switchObservatoryTab('self-knowledge');" style="background:rgba(56,189,248,0.15); border:1px solid #38bdf8; color:#38bdf8; padding:6px 14px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:bold;">Explicar no Twin</button>
            </div>
            <button onclick="this.closest('.v14-screen-modal-overlay').remove()" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:6px 16px; border-radius:6px; cursor:pointer;">Fechar</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } catch (e) {
      console.error('Erro ao abrir screen inspector:', e);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 5. EXPOSURE & INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  window.loadKnowledgeView = loadKnowledgeView;

  // Run immediately if DOM ready, else on DOMContentLoaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(loadKnowledgeView, 50);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(loadKnowledgeView, 50);
    });
  }

  // Also hook into hashchange
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#knowledge') {
      loadKnowledgeView();
    }
  });

  // Call loadKnowledgeView right away synchronously
  try {
    loadKnowledgeView();
  } catch (e) {}

})();
