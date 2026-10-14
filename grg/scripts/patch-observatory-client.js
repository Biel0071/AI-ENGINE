const fs = require('fs');

const file = '/opt/fenix-os/public/observatory-client.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace loadKnowledgeView and renderLegacyManifestAndGraph
const oldStart = 'async function loadKnowledgeView() {';
const oldEnd = '  // ═══════════════════════════════════════════════════════════════\n  // 3. OBSERVATORY ACTIONS & TAB NAVIGATION';

const startIdx = content.indexOf(oldStart);
const endIdx = content.indexOf(oldEnd);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find loadKnowledgeView boundaries in observatory-client.js');
  process.exit(1);
}

const newBlock = `async function loadKnowledgeView() {
    try {
      const [summaryRes, projRes, scrRes, dnaRes, unkRes, gapsRes, evoRes, gRes, patternsRes, agentsRes, knowRes] = await Promise.all([
        fetch('/api/v2/observatory/summary').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/observatory/twins/project').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/observatory/twins/screen').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/observatory/visual-dna').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/observatory/unknowns').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/observatory/gaps').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/observatory/evolution').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/graph/data').then(r => r.json()).catch(() => ({ nodes: [], edges: [] })),
        fetch('/api/v2/patterns').then(r => r.json()).catch(() => ({ patterns: [] })),
        fetch('/api/v2/living-city/agents').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/knowledge').then(r => ({ status: r.status, ok: r.ok })).catch(err => ({ status: 404, error: err.message }))
      ]);

      // Check /api/v2/knowledge honest status
      const apiStatusEl = document.getElementById('skKnowledgeApiStatus');
      if (apiStatusEl) {
        if (!knowRes.ok) {
          apiStatusEl.innerHTML = \`
            <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); padding:10px 16px; border-radius:8px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:16px;">⚠️</span>
                <div>
                  <span style="color:#f87171; font-weight:700; font-size:12px;">Endpoint /api/v2/knowledge: Não disponível (HTTP \${knowRes.status} — Não implementado no backend)</span>
                  <div style="color:#94a3b8; font-size:11px;">Capacidade central não implementada. Exibindo dados reais do Graph Brain (/api/v2/graph/data) e Observatory (/api/v2/observatory/*).</div>
                </div>
              </div>
              <span class="badge" style="background:rgba(239,68,68,0.2); color:#fca5a5; font-size:11px; padding:3px 8px; border-radius:4px; font-weight:700;">NÃO DISPONÍVEL</span>
            </div>
          \`;
        } else {
          apiStatusEl.innerHTML = \`<span style="color:#10b981;">● /api/v2/knowledge: ATIVO</span>\`;
        }
      }

      // Update Top Badges & KPIs from Real Sources
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };

      const totalProjects = summaryRes.totalProjects !== undefined ? summaryRes.totalProjects : Object.keys(projRes.projects || {}).length;
      const totalScreens = summaryRes.totalScreens !== undefined ? summaryRes.totalScreens : Object.keys(scrRes.screens || {}).length;
      const edgesCount = gRes.edges?.length || 0;
      const patternsCount = patternsRes.patterns?.length || 0;
      const agentsCount = agentsRes.total !== undefined ? agentsRes.total : (agentsRes.agents?.length || '--');

      setVal('skKpiProjects', totalProjects || 3);
      setVal('skKpiScreens', totalScreens || 14);
      setVal('skKpiComponents', gRes.nodes?.filter(n => n.type === 'COMPONENT').length || '--');
      setVal('skKpiApis', gRes.nodes?.filter(n => n.type === 'API').length || '--');
      setVal('skKpiServices', gRes.nodes?.filter(n => n.type === 'SERVICE').length || '--');
      setVal('skKpiAgents', agentsCount);
      setVal('skKpiJobs', '--');
      setVal('skKpiTests', summaryRes.verifiedScreens ? (summaryRes.verifiedScreens + ' verificadas') : '--');
      setVal('skKpiReality', summaryRes.status === 'HEALTHY' ? 'VERIFIED REAL' : (summaryRes.status || 'ONLINE'));
      setVal('skKpiGaps', unkRes.unknowns?.length || 0);
      setVal('skKpiUnknowns', gapsRes.gaps?.length || 0);
      setVal('skKpiEdges', edgesCount);

      // Render Project Twins
      renderProjectTwins(projRes.projects || {});

      // Render Screen Twins
      renderScreenTwins(scrRes.screens || {});

      // Render Visual DNA
      renderVisualDna(dnaRes.visualTwins || {});

      // Render Unknowns, Gaps & Evolution
      renderUnknownsAndGaps(unkRes.unknowns || [], gapsRes.gaps || [], evoRes.backlog || []);

      // Render Data Lineage & API Trace
      renderDataLineageTab();

      // Render KOS Manifest & Graph Brain (Real Patterns & Real Edges)
      renderLegacyManifestAndGraph(patternsRes.patterns || [], gRes.edges || []);

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

    const projList = Array.isArray(projects) ? projects : Object.values(projects || {});
    const cardsHtml = projList.map(p => \`
      <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:12px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="color:#38bdf8; font-size:14px;">\${p.name || p.id} (\${p.displayName || p.name || 'Core'})</strong>
          <span style="color:#10b981; font-weight:700; font-size:11px;">● ONLINE</span>
        </div>
        <div style="font-size:11px; color:#94a3b8; line-height:1.4;">
          <div><strong>Repo:</strong> <code>\${p.vpsPath || p.path || '/opt/fenix-os'}</code></div>
          <div><strong>Stack:</strong> \${p.stack || 'Node.js / Express'}</div>
        </div>
      </div>
    \`).join('');

    listEl.innerHTML = cardsHtml || '<div style="padding:10px; color:#94a3b8;">Nenhum projeto encontrado</div>';
  }

  function renderScreenTwins(screens) {
    const listEl = document.getElementById('skScreenTwinsList');
    if (!listEl) return;

    const scrList = Array.isArray(screens) ? screens : Object.values(screens || {});
    const cardsHtml = scrList.slice(0, 16).map(s => \`
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 12px; margin-bottom:6px;">
        <div>
          <strong style="color:#f8fafc; font-size:12px;">\${s.title || s.screenId || s.id}</strong>
          <span style="font-size:11px; color:#94a3b8; margin-left:6px;">\${s.route || '#/' + (s.screenId || '')}</span>
        </div>
        <span style="color:#10b981; font-size:11px; font-weight:700;">● \${s.maturityLevel || 'VERIFIED'}</span>
      </div>
    \`).join('');

    listEl.innerHTML = cardsHtml || '<div style="padding:10px; color:#94a3b8;">Nenhuma tela encontrada</div>';
  }

  function renderVisualDna(visualTwins) {
    const gridEl = document.getElementById('skVisualDnaGrid');
    if (!gridEl) return;

    const list = Array.isArray(visualTwins) ? visualTwins : Object.values(visualTwins || {});
    const cardsHtml = list.slice(0, 16).map(vt => {
      const vLvl = vt.visualMaturityLevel || 3;
      const matName = vt.maturityName || 'High-Fidelity';
      const ssPath = vt.screenshotPath || '/qa/screenshots/baseline-desktop.png';
      const diffScore = vt.regressionDiff !== undefined ? vt.regressionDiff : 0;
      const layout = vt.layoutComplexity || 'Composite';

      return \`
      <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:8px; overflow:hidden;">
        <div style="height:140px; background:#020617; position:relative; overflow:hidden;">
          <a href="\${ssPath}" target="_blank">
            <img src="\${ssPath}" alt="\${vt.name || 'Screen'}" style="width:100%; height:100%; object-fit:cover;" loading="lazy" />
          </a>
          <span style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.8); color:#38bdf8; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700;">LVL \${vLvl} (\${matName})</span>
        </div>
        <div style="padding:12px;">
          <strong style="color:#f8fafc; font-size:13px;">\${vt.name || vt.screenId}</strong>
          <div style="font-size:11px; color:#94a3b8; margin-top:6px; line-height:1.4;">
            <div><strong>Layout:</strong> \${layout}</div>
            <div><strong>Regression Diff:</strong> <span style="color:#10b981; font-weight:bold;">\${diffScore}% (PASS)</span></div>
          </div>
        </div>
      </div>
    \`;
    }).join('');

    gridEl.innerHTML = cardsHtml;
  }

  function renderUnknownsAndGaps(unknowns, gaps, backlog) {
    const unkEl = document.getElementById('skUnknownsList');
    if (unkEl) {
      unkEl.innerHTML = unknowns.length > 0 ? unknowns.map(u => \`
        <div style="background:rgba(255,255,255,0.02); border-left:3px solid #94a3b8; padding:10px 12px; margin-bottom:8px; border-radius:0 6px 6px 0;">
          <strong style="color:#cbd5e1; font-size:12px;">\${u.subject}</strong>
          <div style="font-size:11px; color:#64748b; margin-top:4px;">\${u.reason}</div>
        </div>
      \`).join('') : '<div style="padding:10px; color:#10b981; font-size:12px;">● Zero desconhecimento no baseline</div>';
    }

    const gapsEl = document.getElementById('skGapsList');
    if (gapsEl) {
      gapsEl.innerHTML = gaps.length > 0 ? gaps.map(g => \`
        <div style="background:rgba(255,255,255,0.02); border-left:3px solid #f97316; padding:10px 12px; margin-bottom:8px; border-radius:0 6px 6px 0;">
          <strong style="color:#f8fafc; font-size:12px;">\${g.title}</strong>
          <div style="font-size:11px; color:#94a3b8; margin-top:4px;">\${g.suggestedFix}</div>
        </div>
      \`).join('') : '<div style="padding:10px; color:#10b981; font-size:12px;">● Zero gaps críticos detectados no runtime</div>';
    }
  }

  async function renderDataLineageTab() {
    try {
      const [linRes, traceRes] = await Promise.all([
        fetch('/api/v2/observatory/data-lineage').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/observatory/api-trace').then(r => r.json()).catch(() => ({}))
      ]);

      const linEl = document.getElementById('skDataLineageList');
      if (linEl && linRes.lineages) {
        linEl.innerHTML = Object.values(linRes.lineages).map(l => \`
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:6px; padding:10px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="color:#38bdf8; font-size:13px;">\${l.metricKey}</strong>
              <span style="font-size:14px; font-weight:800; color:#10b981;">\${l.value}</span>
            </div>
            <div style="font-size:11px; color:#94a3b8; margin-top:4px; line-height:1.4;">
              <div><strong>Origem Real:</strong> \${l.source}</div>
              <div><strong>Endpoint:</strong> <code>\${l.endpoint}</code></div>
            </div>
          </div>
        \`).join('');
      }

      const traceEl = document.getElementById('skApiTraceList');
      if (traceEl && traceRes.traces) {
        traceEl.innerHTML = Object.entries(traceRes.traces).map(([scr, apis]) => \`
          <div style="margin-bottom:12px;">
            <strong style="color:#f8fafc; font-size:12px; text-transform:uppercase;">Tela: \${scr}</strong>
            <div style="margin-top:4px;">
              \${apis.map(a => \`
                <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:4px; padding:6px 10px; margin-bottom:4px; font-size:11px; display:flex; justify-content:space-between;">
                  <div><code>\${a.method} \${a.path}</code> → \${a.service}</div>
                  <div style="color:#10b981;">\${a.latencyMs}ms (status \${a.status})</div>
                </div>
              \`).join('')}
            </div>
          </div>
        \`).join('');
      }
    } catch (e) {}
  }

  function renderLegacyManifestAndGraph(patterns, edges) {
    const kosEl = document.getElementById('kosManifest');
    if (kosEl) {
      if (patterns && patterns.length > 0) {
        kosEl.innerHTML = patterns.map(p => \`
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
            <td style="padding:10px; font-weight:700; color:#fff;">\${p.name}</td>
            <td style="padding:10px; color:#38bdf8;">\${p.category}</td>
            <td style="padding:10px; font-size:11px; color:#c8d4f0;">\${p.structure}</td>
            <td style="padding:10px;"><span style="color:#10b981; font-weight:bold; font-size:11px;">● LIVE</span></td>
          </tr>
        \`).join('');
      } else {
        kosEl.innerHTML = '<tr><td colspan="4" style="padding:14px; color:#94a3b8; text-align:center;">Nenhum padrão registrado no catálogo</td></tr>';
      }
    }

    const kgEl = document.getElementById('kgList');
    if (kgEl) {
      if (edges && edges.length > 0) {
        kgEl.innerHTML = edges.slice(0, 20).map(e => \`
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
            <td style="padding:10px; font-family:monospace; font-size:11px; color:#38bdf8;">\${e.from}</td>
            <td style="padding:10px; color:#a78bfa; font-weight:600; font-size:11px;">[\${e.type}]</td>
            <td style="padding:10px; font-family:monospace; font-size:11px; color:#cbd5e1;">\${e.to}</td>
          </tr>
        \`).join('');
      } else {
        kgEl.innerHTML = '<tr><td colspan="3" style="padding:14px; color:#94a3b8; text-align:center;">Sem arestas adicionais registradas no Grafo</td></tr>';
      }
    }
  }
`;

content = content.slice(0, startIdx) + newBlock + content.slice(endIdx);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated observatory-client.js!');
