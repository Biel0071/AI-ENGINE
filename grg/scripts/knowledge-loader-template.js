if (typeof window !== 'undefined') {
  window.loadKnowledgeView = async function() {
    const kosManifest = document.getElementById('kosManifest');
    const kgList = document.getElementById('kgList');
    const apiStatusEl = document.getElementById('skKnowledgeApiStatus');

    try {
      const [patternsRes, gRes, obsSummary, obsTwins, knowRes, agentsRes] = await Promise.all([
        fetch('/api/v2/patterns').then(r => r.json()).catch(() => ({ patterns: [] })),
        fetch('/api/v2/graph/data').then(r => r.json()).catch(() => ({ nodes: [], edges: [] })),
        fetch('/api/v2/observatory/summary').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/observatory/twins/project').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/knowledge').then(r => ({ status: r.status, ok: r.ok })).catch(err => ({ status: 404, error: err.message })),
        fetch('/api/v2/living-city/agents').then(r => r.json()).catch(() => ({}))
      ]);

      // Render honest status of /api/v2/knowledge
      if (apiStatusEl) {
        if (!knowRes.ok) {
          apiStatusEl.innerHTML = `
            <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); padding:10px 16px; border-radius:8px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:16px;">⚠️</span>
                <div>
                  <span style="color:#f87171; font-weight:700; font-size:12px;">Endpoint /api/v2/knowledge: Não disponível (HTTP ${knowRes.status} — Não implementado no backend)</span>
                  <div style="color:#94a3b8; font-size:11px;">Capacidade central não implementada. Exibindo dados reais do Graph Brain (/api/v2/graph/data) e Observatory (/api/v2/observatory/*).</div>
                </div>
              </div>
              <span class="badge" style="background:rgba(239,68,68,0.2); color:#fca5a5; font-size:11px; padding:3px 8px; border-radius:4px; font-weight:700;">NÃO DISPONÍVEL</span>
            </div>
          `;
        } else {
          apiStatusEl.innerHTML = `
            <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); padding:10px 16px; border-radius:8px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#10b981; font-weight:700; font-size:12px;">● /api/v2/knowledge: ATIVO</span>
            </div>
          `;
        }
      }

      const patterns = patternsRes.patterns || [];
      const edges = gRes.edges || [];
      const nodes = gRes.nodes || [];
      const totalProjects = obsSummary.totalProjects !== undefined ? obsSummary.totalProjects : (obsTwins.projects?.length || '--');
      const totalScreens = obsSummary.totalScreens !== undefined ? obsSummary.totalScreens : '--';
      const agentsCount = agentsRes.total !== undefined ? agentsRes.total : (agentsRes.agents?.length || '--');

      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
      setEl('skKpiProjects', totalProjects);
      setEl('skKpiScreens', totalScreens);
      setEl('skKpiComponents', nodes.filter(n => n.type === 'COMPONENT').length || '--');
      setEl('skKpiApis', nodes.filter(n => n.type === 'API').length || '--');
      setEl('skKpiServices', nodes.filter(n => n.type === 'SERVICE').length || '--');
      setEl('skKpiAgents', agentsCount);
      setEl('skKpiJobs', '--');
      setEl('skKpiSkills', patterns.length);
      setEl('skKpiProviders', '--');
      setEl('skKpiDatabases', '--');
      setEl('skKpiQueues', '--');
      setEl('skKpiTests', '--');
      setEl('skKpiGaps', '0');
      setEl('skKpiUnknowns', '0');
      setEl('skKpiEdges', edges.length);

      const driftBadge = document.getElementById('skDriftBadge');
      if (driftBadge) {
        if (obsSummary.drift && obsSummary.drift > 0) {
          driftBadge.textContent = '⚠️ DRIFT DETECTADO';
          driftBadge.style.color = '#f59e0b';
          driftBadge.style.background = 'rgba(245,158,11,0.15)';
          driftBadge.style.borderColor = 'rgba(245,158,11,0.3)';
        } else {
          driftBadge.textContent = '● ZERO DRIFT BASELINE';
          driftBadge.style.color = '#10b981';
          driftBadge.style.background = 'rgba(16,185,129,0.15)';
          driftBadge.style.borderColor = 'rgba(16,185,129,0.3)';
        }
      }

      if (kosManifest) {
        if (patterns.length > 0) {
          kosManifest.innerHTML = patterns.map(p => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
              <td style="padding:10px; font-weight:700; color:#fff;">${p.name}</td>
              <td style="padding:10px; color:var(--fenix-cyan);">${p.category}</td>
              <td style="padding:10px; font-size:11px; color:#c8d4f0;">${p.structure}</td>
              <td style="padding:10px;"><span style="color:#10b981; font-weight:bold; font-size:11px;">● LIVE</span></td>
            </tr>
          `).join('');
        } else {
          kosManifest.innerHTML = '<tr><td colspan="4" style="padding:16px; color:#94a3b8; text-align:center;">Nenhum padrão registrado no catálogo</td></tr>';
        }
      }

      if (kgList) {
        if (edges.length > 0) {
          kgList.innerHTML = edges.slice(0, 25).map(e => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
              <td style="padding:10px; font-family:monospace; font-size:11px; color:#38bdf8;">${e.from}</td>
              <td style="padding:10px; color:#a78bfa; font-weight:600; font-size:11px;">[${e.type}]</td>
              <td style="padding:10px; font-family:monospace; font-size:11px; color:#cbd5e1;">${e.to}</td>
            </tr>
          `).join('');
        } else {
          kgList.innerHTML = '<tr><td colspan="3" style="padding:16px; color:#94a3b8; text-align:center;">Nenhuma conexão registrada no Grafo de Conhecimento</td></tr>';
        }
      }
    } catch(e) {
      console.error('loadKnowledgeView error:', e);
      if (kosManifest) kosManifest.innerHTML = `<tr><td colspan="4" style="padding:16px; color:#f87171; font-size:12px;">Falha ao carregar padrões KOS (${e.message}) <button onclick="window.loadKnowledgeView()" style="background:#3b82f6;color:#fff;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;margin-left:6px;">Retry</button></td></tr>`;
      if (kgList) kgList.innerHTML = `<tr><td colspan="3" style="padding:16px; color:#f87171; font-size:12px;">Falha ao carregar Knowledge Graph (${e.message}) <button onclick="window.loadKnowledgeView()" style="background:#3b82f6;color:#fff;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;margin-left:6px;">Retry</button></td></tr>`;
    }
  };
}
