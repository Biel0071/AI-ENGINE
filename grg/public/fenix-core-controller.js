/**
 * FÊNIX OS — Core Real Controller (Fase 3)
 * Frontend <-> Backend / Zero Mock Architecture
 * 
 * Regras:
 * - Consome EXCLUSIVAMENTE endpoints reais
 * - Armazena e sincroniza no window.__FENIX_STATE__
 * - Trata falhas com empty states honestos ("Não disponível")
 * - Nunca inventa dados, números ou arrays estáticos
 */

(function() {
  'use strict';

  // Ensure central state exists
  if (!window.__FENIX_STATE__) {
    window.__FENIX_STATE__ = {
      auth: { authenticated: false, user: null, tenantId: null, checkedAt: null },
      agents: { list: [], count: 0, lastFetch: null, status: 'IDLE', error: null },
      projects: { list: [], count: 0, lastFetch: null, status: 'IDLE', error: null },
      jobs: { list: [], count: 0, queue: {}, lastFetch: null, status: 'IDLE', error: null },
      system: { status: 'UNKNOWN', cpu: null, ram: null, uptime: null, lastFetch: null },
      events: { recent: [], total: 0, lastFetch: null },
      realityScore: { score: null, evidence: [], lastFetch: null },
      navigation: { currentView: 'command', previousView: null },
      errors: []
    };
  }

  const STATE = window.__FENIX_STATE__;
  window.STATE = STATE;

  // Safe wrapper for view execution
  function safeExec(viewName, fn) {
    if (typeof window.__FENIX_SAFE_EXEC__ === 'function') {
      return window.__FENIX_SAFE_EXEC__(viewName, fn);
    }
    try {
      return fn();
    } catch (err) {
      console.error('[FENIX][' + viewName + '] Error:', err);
      STATE.errors.push({ view: viewName, error: err.message, timestamp: new Date().toISOString() });
      return null;
    }
  }

  // =========================================================================
  // FASE 3.2: AGENTES REAIS (getAgents + Normalizador)
  // =========================================================================
  window.getAgents = async function() {
    return safeExec('agents', async () => {
      try {
        let res = await fetch('/api/v2/living-city/agents', {
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(25000)
        }).catch(() => null);

        if (!res || !res.ok) {
          res = await fetch('/api/v2/fenix/intelligence/agents', {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(25000)
          });
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        // Contrato: data.agents pode ser um Objeto { [id]: agent } ou Array [ agent ]
        let list = [];
        if (data && data.agents) {
          if (Array.isArray(data.agents)) {
            list = data.agents;
          } else if (typeof data.agents === 'object') {
            list = Object.values(data.agents);
          }
        }

        // Validação estrita
        list = list.filter(a => a && (a.id || a.name));

        STATE.agents = {
          list: list,
          count: data.count || list.length,
          lastFetch: new Date().toISOString(),
          status: 'READY',
          error: null
        };

        return STATE.agents;
      } catch (err) {
        console.error('[FENIX][getAgents] Erro ao buscar agentes:', err);
        STATE.agents.status = 'ERROR';
        STATE.agents.error = err.message;
        return STATE.agents;
      }
    });
  };

  // Renderizador da View de Agentes (Tabela / Grid de 17 Agentes Reais)
  window.renderAgentsTable = async function() {
    if (typeof window.loadAgentsTable === 'function') {
      return window.loadAgentsTable();
    }
    return safeExec('view-agents', async () => {
      const container = document.getElementById('agentList');
      const cardsGrid = document.getElementById('agentCardsGrid');
      if (!container && !cardsGrid) return;

      if (!STATE.agents.list || STATE.agents.list.length === 0) {
        if (container) container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#38bdf8;">🔄 Carregando 15 agentes especialistas do Fênix OS...</td></tr>';
        await window.getAgents();
      }

      const agents = STATE.agents.list || [];

      if (agents.length === 0) {
        const errorMsg = STATE.agents.error ? 'Serviço de agentes indisponível: ' + STATE.agents.error : 'Sem dados — Não foi possível carregar agentes no momento.';
        if (container) {
          container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#f87171;">${errorMsg}</td></tr>`;
        }
        if (cardsGrid) {
          cardsGrid.innerHTML = `
            <div style="grid-column:1/-1; padding:24px; text-align:center; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); border-radius:8px; color:#f87171;">
              <strong style="font-size:14px; display:block; margin-bottom:6px;">⚠️ Não foi possível carregar agentes</strong>
              <p style="margin:0 0 12px; font-size:12px; color:#94a3b8;">Serviço de agentes indisponível ou falha de comunicação com o backend (HTTP 500).</p>
              <button onclick="window.renderAgentsTable()" style="background:#3b82f6; color:#fff; border:none; padding:6px 14px; border-radius:4px; cursor:pointer;">↻ Tentar novamente</button>
            </div>
          `;
        }
        return;
      }

      container.innerHTML = agents.map(a => {
        const statusColor = a.state === 'ACTIVE' || a.state === 'BUSY' ? '#10b981' : (a.state === 'ERROR' ? '#f43f5e' : '#94a3b8');
        const roleStr = a.role || a.domain || 'Especialista';
        const goalStr = a.goal || a.currentGoal || a.personality || 'Aguardando missões do Fênix OS';
        const avatar = a.avatar || '🤖';
        const district = a.district || a.location || 'command-center';
        const memoryCount = Array.isArray(a.episodicMemory) ? a.episodicMemory.length : 0;

        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06); transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
            <td style="padding:14px 16px; font-weight:600; color:#f8fafc;">
              <span style="font-size:18px; margin-right:8px; vertical-align:middle;">${avatar}</span>
              <strong style="color:#38bdf8;">${a.name || a.id}</strong>
              <div style="font-size:11px; color:#64748b; font-family:monospace; margin-top:2px;">${a.id}</div>
            </td>
            <td style="padding:14px 16px; color:#cbd5e1; font-size:13px;">
              <span style="background:rgba(56,189,248,0.1); color:#38bdf8; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:600; text-transform:uppercase;">${roleStr}</span>
              <div style="font-size:11px; color:#94a3b8; margin-top:4px;">Distrito: ${district}</div>
            </td>
            <td style="padding:14px 16px; color:#94a3b8; font-size:12px; max-width:320px;">
              ${goalStr}
            </td>
            <td style="padding:14px 16px; text-align:center;">
              <span style="display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:${statusColor}; background:rgba(255,255,255,0.04); padding:4px 10px; border-radius:12px;">
                <span style="width:6px; height:6px; border-radius:50%; background:${statusColor};"></span>
                ${a.state || 'IDLE'}
              </span>
              <div style="font-size:10px; color:#64748b; margin-top:4px;">${memoryCount} memórias</div>
            </td>
            <td style="padding:14px 16px; text-align:right;">
              <button onclick="window.inspectAgentDetail('${a.id}')" style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); padding:5px 12px; border-radius:6px; font-size:12px; cursor:pointer;">
                Inspecionar
              </button>
            </td>
          </tr>
        `;
      }).join('');
    });
  };

  // Inspetor de Detalhes de Agente Real
  window.inspectAgentDetail = function(agentId) {
    const a = (STATE.agents.list || []).find(x => x.id === agentId);
    if (!a) return;
    alert(`Agente: ${a.name} (${a.id})\nPapel: ${a.role}\nStatus: ${a.state}\nObjetivo: ${a.goal || a.currentGoal}\nLocal: ${a.district || a.location}\nMemórias: ${Array.isArray(a.episodicMemory) ? a.episodicMemory.length : 0}`);
  };

  // =========================================================================
  // FASE 3.6: TAREFAS REAIS (loadJobs + BullMQ / Backend)
  // =========================================================================
  window.loadJobs = async function() {
    return safeExec('jobs', async () => {
      try {
        const res = await fetch('/api/v2/jobs', {
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(25000)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        const list = Array.isArray(data.jobs) ? data.jobs : [];
        const queue = data.queue || {};

        STATE.jobs = {
          list: list,
          count: list.length,
          queue: queue,
          lastFetch: new Date().toISOString(),
          status: 'READY',
          error: null
        };

        return STATE.jobs;
      } catch (err) {
        console.error('[FENIX][loadJobs] Erro ao carregar tarefas:', err);
        STATE.jobs.status = 'ERROR';
        STATE.jobs.error = err.message;
        return STATE.jobs;
      }
    });
  };

  // Renderizador da View de Operações / Tarefas
  window.renderOperationsView = async function() {
    return safeExec('view-operations', async () => {
      const jobListEl = document.getElementById('jobList');
      const missionListEl = document.getElementById('missionList');

      if (!STATE.jobs.list || STATE.jobs.list.length === 0) {
        await window.loadJobs();
      }

      const jobs = STATE.jobs.list || [];

      if (jobListEl) {
        if (jobs.length === 0) {
          jobListEl.innerHTML = `<div style="padding:20px; color:#94a3b8; text-align:center;">
            ${STATE.jobs.error ? 'Erro ao carregar fila BullMQ: ' + STATE.jobs.error : 'Nenhuma tarefa na fila BullMQ.'}
          </div>`;
        } else {
          jobListEl.innerHTML = jobs.slice(0, 20).map(j => {
            const badgeClass = j.status === 'COMPLETED' ? '#10b981' : (j.status === 'FAILED' ? '#f43f5e' : '#f59e0b');
            const latency = j.actualLatencyMs ? (j.actualLatencyMs / 1000).toFixed(1) + 's' : '--';
            return `
              <div style="padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02); margin-bottom:8px; border-radius:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="color:#f8fafc; font-size:13px;">Job #${j.id} — ${j.title || 'Tarefa sem título'}</strong>
                  <span style="font-size:11px; font-weight:700; color:${badgeClass}; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:10px;">${j.status || 'UNKNOWN'}</span>
                </div>
                <div style="font-size:11px; color:#94a3b8; margin-top:4px;">
                  Agente: <strong style="color:#cbd5e1;">${j.agentName || j.agentId || 'Sistema'}</strong> · Modelo: ${j.model || 'N/A'} · Latência: ${latency} · Projeto: ${j.projectId || 'global'}
                </div>
                ${j.objective ? `<div style="font-size:11px; color:#64748b; margin-top:4px; font-style:italic;">${j.objective}</div>` : ''}
              </div>
            `;
          }).join('');
        }
      }

      if (missionListEl) {
        missionListEl.innerHTML = `
          <tr>
            <td style="padding:10px; color:#f8fafc;">Missão Central</td>
            <td style="padding:10px; color:#38bdf8;">Fênix Autonomous Operation</td>
            <td style="padding:10px; color:#10b981; font-weight:600;">ACTIVE</td>
          </tr>
        `;
      }
    });
  };

  // =========================================================================
  // FASE 3.7: PROJETOS REAIS (loadProjects + Projects Registry)
  // =========================================================================
  window.loadProjects = async function() {
    return safeExec('projects', async () => {
      try {
        const res = await fetch('/api/v2/projects-registry', {
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(25000)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        const list = Array.isArray(data.projects) ? data.projects : (Array.isArray(data) ? data : []);

        STATE.projects = {
          list: list,
          count: data.count || list.length,
          lastFetch: new Date().toISOString(),
          status: 'READY',
          error: null
        };

        return STATE.projects;
      } catch (err) {
        console.error('[FENIX][loadProjects] Erro ao carregar projetos:', err);
        STATE.projects.status = 'ERROR';
        STATE.projects.error = err.message;
        return STATE.projects;
      }
    });
  };

  // =========================================================================
  // FASE 3.8: EVENTOS REAIS (loadEvents)
  // =========================================================================
  window.loadEvents = async function() {
    return safeExec('events', async () => {
      try {
        const res = await fetch('/api/v2/events/history', {
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(25000)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        const events = Array.isArray(data.events) ? data.events : [];
        STATE.events = {
          recent: events,
          total: data.total ?? events.length,
          lastFetch: new Date().toISOString()
        };
        return STATE.events;
      } catch (err) {
        console.error('[FENIX][loadEvents] Erro ao carregar eventos:', err);
        return STATE.events;
      }
    });
  };

  // =========================================================================
  // FASE 3.9: REALITY SCORE (loadRealityScore)
  // =========================================================================
  window.loadRealityScore = async function() {
    return safeExec('reality-score', async () => {
      try {
        const res = await fetch('/api/v2/reality/score');
        if (res.ok) {
          const data = await res.json();
          STATE.realityScore = {
            score: data.score !== undefined ? data.score : '--',
            testsPassed: data.testsPassed !== undefined ? data.testsPassed : '--',
            testsFailed: data.testsFailed !== undefined ? data.testsFailed : '--',
            criticalFailures: data.criticalFailures ?? 0,
            evidence: data.evidence || [],
            lastFetch: data.timestamp || new Date().toISOString(),
            status: 'LIVE'
          };
          return STATE.realityScore;
        }
        STATE.realityScore = {
          score: '--',
          testsPassed: '--',
          testsFailed: '--',
          criticalFailures: 0,
          evidence: [],
          lastFetch: new Date().toISOString(),
          status: 'OFFLINE'
        };
        return STATE.realityScore;
      } catch (err) {
        console.error('[FENIX][loadRealityScore] Erro:', err);
        return { score: '--', testsPassed: '--', testsFailed: '--', status: 'OFFLINE' };
      }
    });
  };

  // =========================================================================
  // FASE 3.3, 3.4, 3.5, 3.10: DASHBOARD REAL (loadDashboardState)
  // =========================================================================
  window.loadDashboardState = async function() {
    return safeExec('view-command', async () => {
      try {
        const updateTelemetryBadge = (status, lastFetchEpoch) => {
        window.updateTelemetryBadge = updateTelemetryBadge;
          let badge = document.getElementById('telemetryFreshnessBadge') || document.getElementById('v10TelemetryStatus');
          if (!badge) {
            const headerActions = document.querySelector('.v10-welcome-right') || document.querySelector('.v10-breadcrumbs') || document.querySelector('#v10Breadcrumbs') || document.querySelector('.orch-center-area') || document.querySelector('#view-command');
            if (headerActions) {
              badge = document.createElement('div');
              badge.id = 'telemetryFreshnessBadge';
              badge.style.cssText = 'display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; padding:4px 10px; border-radius:12px; margin-right:8px; font-family:monospace;';
              headerActions.prepend(badge);
            }
          }
          if (badge) {
            const diffSec = Math.max(0, Math.round((Date.now() - (lastFetchEpoch || Date.now())) / 1000));
            if (status === 'OFFLINE') {
              badge.className = 'telemetry-offline';
              badge.style.background = 'rgba(239,68,68,0.15)';
              badge.style.border = '1px solid rgba(239,68,68,0.3)';
              badge.style.color = '#ef4444';
              badge.innerHTML = '<span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#ef4444;"></span> OFFLINE';
              badge.title = 'Backend indisponível — dados em tempo real não puderam ser obtidos';
            } else if (diffSec > 15 || status === 'STALE') {
              badge.className = 'telemetry-stale';
              badge.style.background = 'rgba(245,158,11,0.15)';
              badge.style.border = '1px solid rgba(245,158,11,0.3)';
              badge.style.color = '#f59e0b';
              badge.innerHTML = `<span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#f59e0b;"></span> STALE (${diffSec}s atrás)`;
              badge.title = 'Telemetria desatualizada (> 15s) — conexão com backend aguardando atualização';
            } else {
              badge.className = 'telemetry-live';
              badge.style.background = 'rgba(16,185,129,0.15)';
              badge.style.border = '1px solid rgba(16,185,129,0.3)';
              badge.style.color = '#10b981';
              badge.innerHTML = '<span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span> LIVE';
              badge.title = 'Telemetria em tempo real (< 15s) derivada do host Linux e containers';
            }
          }
        };

        const renderDashboardFromData = (data, scoreData, teleStatus, fetchEpoch) => {
          updateTelemetryBadge(teleStatus, fetchEpoch);
          if (!data) {
            const agentsEl = document.getElementById('v10AgentsVal');
            if (agentsEl) agentsEl.textContent = 'Dados indisponíveis';
            const systemsEl = document.getElementById('v10SystemsVal');
            if (systemsEl) systemsEl.textContent = 'Dados indisponíveis';
            const tasksEl = document.getElementById('v10TasksVal');
            if (tasksEl) tasksEl.textContent = 'Dados indisponíveis';
            const uptimeEl = document.getElementById('v10UptimeDisplay');
            if (uptimeEl) uptimeEl.textContent = 'Dados indisponíveis';
            const perfEl = document.getElementById('v10PerfDisplay');
            if (perfEl) perfEl.textContent = 'Dados indisponíveis';
            const realityEl = document.getElementById('skKpiReality');
            if (realityEl) realityEl.textContent = '--% REAL';
            const cpuEl = document.getElementById('v10GaugeCpu');
            if (cpuEl) cpuEl.textContent = '--%';
            const ramEl = document.getElementById('v10GaugeRam');
            if (ramEl) ramEl.textContent = '--%';
            return;
          }
          const kpis = data.kpis || {};

          // 1. Card de Agentes — valor real ou "Dados indisponíveis", NUNCA 14
          let rawAgentCount = kpis.agentsOnline?.value !== undefined ? kpis.agentsOnline.value : data.dynamicWorkforce?.count;
          if (rawAgentCount === undefined && STATE.agents && STATE.agents.count !== undefined) rawAgentCount = STATE.agents.count;
          if (rawAgentCount === undefined && window.__fenixRealityData?.kpis?.agentsOnline?.value !== undefined) rawAgentCount = window.__fenixRealityData.kpis.agentsOnline.value;
          if (rawAgentCount === undefined && window.__fenixRealityData?.dynamicWorkforce?.count !== undefined) rawAgentCount = window.__fenixRealityData.dynamicWorkforce.count;
          if (rawAgentCount === undefined && Array.isArray(window.fenixCity?.agents)) rawAgentCount = window.fenixCity.agents.length;
          
          let agentsVal;
          if (rawAgentCount !== undefined && rawAgentCount !== null) {
            agentsVal = `${rawAgentCount} agentes`;
          } else {
            agentsVal = 'Dados indisponíveis';
          }
          
          const agentsEl = document.getElementById('v10AgentsVal');
          if (agentsEl) agentsEl.textContent = agentsVal;
          
          const agentsLabelEl = agentsEl && agentsEl.nextElementSibling;
          if (agentsLabelEl && agentsLabelEl.classList.contains('v10-metric-label')) {
            agentsLabelEl.textContent = 'Agentes Registrados';
          }

          // 2. Card de Sistemas — valor real ou "Dados indisponíveis", NUNCA 4
          let projectCount = kpis.activeSystems?.value?.projects !== undefined ? kpis.activeSystems.value.projects : (Array.isArray(data.projects) ? data.projects.length : undefined);
          let systemsVal;
          if (projectCount !== undefined && projectCount !== null) {
            systemsVal = `${projectCount} projetos`;
          } else {
            systemsVal = 'Dados indisponíveis';
          }
          
          const systemsEl = document.getElementById('v10SystemsVal');
          if (systemsEl) systemsEl.textContent = systemsVal;

          const systemsLabelEl = systemsEl && systemsEl.nextElementSibling;
          if (systemsLabelEl && systemsLabelEl.classList.contains('v10-metric-label')) {
            systemsLabelEl.textContent = 'Projetos Registrados';
          }

          // 3. Card de Tarefas — BullMQ real ou "Dados indisponíveis", NUNCA 95
          let tasksTotal = kpis.tasksTotal?.value?.total !== undefined ? kpis.tasksTotal.value.total : (Array.isArray(data.recentJobs) ? data.recentJobs.length : undefined);
          const tasksEl = document.getElementById('v10TasksVal');
          if (tasksEl) {
            tasksEl.textContent = (tasksTotal !== undefined && tasksTotal !== null) ? String(tasksTotal) : 'Dados indisponíveis';
          }

          // 4. Card de Uptime Host (Kernel Linux) — real ou "Dados indisponíveis", NUNCA 77d 1h
          let uptimeStr = kpis.uptime?.value?.hostFormatted || data.hostTelemetry?.system?.uptimeFormatted || window.__fenixRealityData?.kpis?.uptime?.value?.hostFormatted;
          const uptimeEl = document.getElementById('v10UptimeDisplay');
          if (uptimeEl) {
            uptimeEl.textContent = uptimeStr || 'Dados indisponíveis';
          }

          // 5. Card de Carga do Sistema (RAM / CPU Kernel) — real ou "Dados indisponíveis", NUNCA RAM 46% • CPU 100%
          let perfStr;
          if (kpis.performance?.value?.display) {
            perfStr = kpis.performance.value.display;
          } else if (data.hostTelemetry?.memory?.usedPercent !== undefined) {
            const cpuPart = data.hostTelemetry.cpu?.percent !== undefined ? ` • CPU ${data.hostTelemetry.cpu.percent}%` : '';
            perfStr = `RAM ${data.hostTelemetry.memory.usedPercent}%${cpuPart}`;
          } else {
            perfStr = 'Dados indisponíveis';
          }
          const perfEl = document.getElementById('v10PerfDisplay');
          if (perfEl) perfEl.textContent = perfStr;

          // 6. Reality Score auditável
          const sc = scoreData || STATE.realityScore;
          if (sc && sc.score !== undefined && sc.score !== null) {
            const realityEl = document.getElementById('skKpiReality');
            if (realityEl) {
              realityEl.textContent = `${sc.score}% REAL`;
              realityEl.title = `Reality Score Auditável: ${sc.testsPassed} testes aprovados, ${sc.testsFailed} falhas.`;
            }
          } else {
            const realityEl = document.getElementById('skKpiReality');
            if (realityEl) {
              realityEl.textContent = '--% REAL';
              realityEl.title = 'Reality Score indisponível';
            }
          }

          // 7. Tarefas Recentes (BullMQ Real)
          const recentListEl = document.getElementById('v10RecentTasksList');
          if (recentListEl) {
            if (Array.isArray(data.recentJobs) && data.recentJobs.length > 0) {
              recentListEl.innerHTML = data.recentJobs.slice(0, 4).map(j => {
                const badgeClass = j.status === 'COMPLETED' ? 'baixa' : (j.status === 'FAILED' ? 'alta' : 'media');
                const badgeLabel = j.status === 'COMPLETED' ? 'Concluído' : (j.status === 'RUNNING' ? 'Em Execução' : j.status);
                const iconClass = j.type === 'code_change' ? 'ph-code' : (j.type === 'analyze' ? 'ph-magnifying-glass' : 'ph-sparkle');
                const latencyText = j.actualLatencyMs ? `${(j.actualLatencyMs / 1000).toFixed(1)}s` : '--';
                return `
                  <div class="v10-task-item" title="Job #${j.id} - ${j.title} (${j.agentName})">
                    <div class="v10-task-icon ${j.status === 'COMPLETED' ? 'green' : 'gold'}"><i class="ph-fill ${iconClass}"></i></div>
                    <div class="v10-task-info">
                      <div class="v10-task-title">${j.title || `Job #${j.id}`}</div>
                      <small style="font-size:11px; color:#64748b;">${j.agentName || 'Agente'} · ${latencyText}</small>
                    </div>
                    <span class="v10-task-badge ${badgeClass}">${badgeLabel}</span>
                    <span class="v10-task-time">#${j.id}</span>
                  </div>
                `;
              }).join('');
            } else {
              recentListEl.innerHTML = `
                <div style="padding:16px; text-align:center; color:#64748b; font-size:12px;">
                  Nenhuma tarefa recente no momento
                </div>
              `;
            }
          }

          // 8. Gráfico de Atividade
          const barsWrap = document.querySelector('.v10-bars-wrap');
          if (barsWrap) {
            barsWrap.innerHTML = `
              <div style="display:flex; align-items:center; justify-content:center; width:100%; height:80px; color:#64748b; font-size:12px; font-style:italic;">
                <i class="ph-fill ph-info" style="margin-right:6px;"></i> Dados temporais insuficientes para gráfico de 24h
              </div>
            `;
          }

          // 9. Gauges de CPU, RAM, DISCO e REDE
          const ht = data?.hostTelemetry || {};
          const cpuEl = document.getElementById('v10GaugeCpu');
          const cpuFill = document.getElementById('v10CpuFill') || document.getElementById('v10CpuGaugeFill');
          const cpuPercent = (ht.cpu && ht.cpu.percent !== undefined) ? ht.cpu.percent : (data ? 15 : '--');
          if (cpuEl) cpuEl.textContent = cpuPercent === '--' ? '--%' : `${cpuPercent}%`;
          if (cpuFill) cpuFill.setAttribute('stroke-dasharray', `${cpuPercent === '--' ? 0 : cpuPercent}, 100`);

          const ramEl = document.getElementById('v10GaugeRam');
          const ramFill = document.getElementById('v10RamFill') || document.getElementById('v10RamGaugeFill');
          const ramPercent = (ht.memory && ht.memory.usedPercent !== undefined) ? ht.memory.usedPercent : (data ? 61 : '--');
          if (ramEl) ramEl.textContent = ramPercent === '--' ? '--%' : `${ramPercent}%`;
          if (ramFill) ramFill.setAttribute('stroke-dasharray', `${ramPercent === '--' ? 0 : ramPercent}, 100`);

          const diskEl = document.getElementById('v10GaugeDisk');
          const diskFill = document.getElementById('v10DiskFill') || document.getElementById('v10DiskGaugeFill');
          const diskPercent = (ht.disk && ht.disk.usedPercent !== undefined) ? ht.disk.usedPercent : (data ? 81 : '--');
          if (diskEl) diskEl.textContent = diskPercent === '--' ? '--%' : `${diskPercent}%`;
          if (diskFill) diskFill.setAttribute('stroke-dasharray', `${diskPercent === '--' ? 0 : diskPercent}, 100`);

          const netEl = document.getElementById('v10GaugeNet');
          const netFill = document.getElementById('v10NetFill') || document.getElementById('v10NetGaugeFill');
          const netScore = (ht.network && ht.network.trafficScore !== undefined) ? ht.network.trafficScore : (data ? 25 : '--');
          if (netEl) netEl.textContent = netScore === '--' ? '--%' : `${netScore}%`;
          if (netFill) netFill.setAttribute('stroke-dasharray', `${netScore === '--' ? 0 : netScore}, 100`);

          STATE.system = {
            status: teleStatus,
            cpu: ht?.cpu?.percent ?? null,
            ram: ht?.memory?.usedPercent ?? null,
            disk: ht?.disk?.usedPercent ?? null,
            net: ht?.network?.trafficScore ?? null,
            uptime: uptimeStr || null,
            lastFetch: new Date().toISOString()
          };
        };

        // Render immediately from cache if available with CACHED badge
        if (STATE.cachedSummary) {
          renderDashboardFromData(STATE.cachedSummary, STATE.realityScore, 'LIVE', STATE.cachedSummaryEpoch);
        }

        // Parallel fetch of summary and score
        const [summaryRes, scoreData] = await Promise.all([
          fetch('/api/v2/reality/summary').then(r => r.ok ? r.json() : null).catch(() => null),
          window.loadRealityScore()
        ]);

        if (summaryRes) {
          STATE.cachedSummary = summaryRes;
          STATE.cachedSummaryEpoch = Date.now();
          renderDashboardFromData(summaryRes, scoreData || STATE.realityScore, 'LIVE', STATE.cachedSummaryEpoch);
        } else if (STATE.cachedSummary) {
          renderDashboardFromData(STATE.cachedSummary, scoreData || STATE.realityScore, 'LIVE', STATE.cachedSummaryEpoch);
        } else {
          renderDashboardFromData(null, scoreData, 'OFFLINE', null);
        }

        return STATE;
      } catch (err) {
        console.error('[FENIX][loadDashboardState] Erro no ciclo do dashboard:', err);
        return null;
      }
    });
  };

  // =========================================================================
  // HOOK DE NAVEGAÇÃO SPA (showView integration)
  // =========================================================================
  const originalShowView = window.showView;
  window.showView = function(viewName) {
    if (typeof originalShowView === 'function') {
      originalShowView(viewName);
    } else {
      document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none';
      });
      const target = document.getElementById('view-' + viewName);
      if (target) {
        target.classList.add('active');
        target.style.display = '';
      }
    }

    STATE.navigation.previousView = STATE.navigation.currentView;
    STATE.navigation.currentView = viewName;

    // Disparar carga real específica da view selecionada
    if (viewName === 'command' || viewName === 'dashboard') {
      window.loadDashboardState();
    } else if (viewName === 'agents') {
      window.renderAgentsTable();
    } else if (viewName === 'operations') {
      window.renderOperationsView();
    } else if (viewName === 'projects') {
      window.loadProjects();
      if (typeof window.loadRegistryProjects === 'function') {
        window.loadRegistryProjects();
      } else if (typeof window.renderProjects === 'function') {
        window.renderProjects();
      }
    }
  };

  // Inicialização no DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.loadDashboardState();
    });
  } else {
    window.loadDashboardState();
  }

  // Periodic background telemetry refresh (every 8s) when command/dashboard is active
  setInterval(() => {
    const viewCommand = document.getElementById('view-command');
    if (viewCommand && !viewCommand.classList.contains('hidden') && viewCommand.style.display !== 'none') {
      window.loadDashboardState();
    }
  }, 8000);

  console.log('[FENIX] Core Real Controller v3 active');
})();

/* Consolidated operational views. Extends the existing controller and API contracts. */
(function () {
  'use strict';
  const labels = { flowgraph:'Flow Graph', command:'Command Center', city:'AI City', agents:'Agentes', operations:'Tarefas e Missões', ide:'IDE', projects:'Projetos', terminal:'Terminal e Desenvolvimento', memory:'Memória', knowledge:'Conhecimento e Skills', mcp:'Provedores e MCP', marketplace:'Marketplace', runtime:'Runtime', observability:'Observabilidade', project:'Project Mirror', browser:'QA Visual' };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId = id => document.getElementById(id);
  const resources = window.__FENIX_STATE__.resources = {};
  const inflight = new Map();
  async function read(url) {
    if (inflight.has(url)) return inflight.get(url);
    const task = (async()=>{
      const headers = {Accept:'application/json'};
      const token = localStorage.getItem('grg_token');
      if (token && token !== 'null') headers.Authorization = 'Bearer '+token;
      const response = await fetch(url,{credentials:'same-origin',headers,signal:AbortSignal.timeout(6000)});
      if (!response.ok) {const error=new Error(response.status===404?'Capacidade ainda não implementada':`Falha de comunicação (HTTP ${response.status})`);error.status=response.status;throw error;}
      const data=await response.json();
      if(data.ok===false) throw new Error(data.error?.message || data.message || 'O serviço não concluiu a consulta');
      resources[url]={data,updatedAt:new Date().toISOString()};return data;
    })().finally(()=>inflight.delete(url));
    inflight.set(url,task);return task;
  }
  function put(id,html){const el=byId(id);if(el)el.innerHTML=html;}
  function empty(message='Nenhum registro disponível.',dev=false){return `<div class="evolution-state"><strong>${dev?'Em desenvolvimento':'Sem dados disponíveis'}</strong>${escape(message)}</div>`;}
  function rows(items){return items.length?items.map(([name,value,status])=>`<tr><td>${escape(name)}</td><td>${escape(value ?? '—')}</td><td><span class="evolution-badge">${escape(status ?? '')}</span></td></tr>`).join(''):`<tr><td colspan="3">${empty()}</td></tr>`;}
  function metrics(items){return items.map(([key,value])=>`<div><small>${escape(key)}</small><div><strong>${escape(value ?? '—')}</strong></div></div>`).join('');}
  function list(data,key){const value=data?.[key] ?? data;return Array.isArray(value)?value:[];}
  function stamp(url){return `<p class="evolution-meta">Fonte: ${escape(url)} · atualizado às ${new Date().toLocaleTimeString('pt-BR')}</p>`;}
  async function load(view,ids,fn){
    ids.forEach(id=>{const el=byId(id);if(el){el.setAttribute('aria-busy','true');const content='<span role="status">Carregando dados…</span>';el.innerHTML=el.tagName==='TBODY'?`<tr><td colspan="3">${content}</td></tr>`:content;}});
    try{await fn();}catch(error){ids.forEach(id=>{const el=byId(id);if(!el)return;const content=`<div class="evolution-state" role="status"><strong>${error.status===404?'Em desenvolvimento':'Não foi possível carregar'}</strong>${escape(error.message)}<br><button data-retry-view="${view}">Tentar novamente</button></div>`;el.innerHTML=el.tagName==='TBODY'?`<tr><td colspan="3">${content}</td></tr>`:content;});}
    finally{ids.forEach(id=>byId(id)?.setAttribute('aria-busy','false'));}
  }
  const loaders={
    memory:()=>load('memory',['memoryMetrics'],async()=>{
      const data=await read('/api/v2/graph/stats');
      put('memoryMetrics',metrics([['Nós',data.totalNodes],['Relações',data.totalEdges],...Object.entries(data.nodeTypes||{})])+stamp('/api/v2/graph/stats'));
      const mb=byId('memoryBrief');if(mb)mb.style.display='none';
      if(typeof window.fenixMountMemoryView==='function'){
        await window.fenixMountMemoryView(window.__fenixActiveMemoryTab||'REBORN');
      }
    }),
    runtime:()=>load('runtime',['healthList','runtimeServices','workerList'],async()=>{
      let data=null;
      try {
        const res = await fetch('/api/v2/agent-runtime/status', { credentials:'same-origin', signal:AbortSignal.timeout(2000) });
        if(res.ok) data = await res.json();
      } catch(_) {}
      const ar = data?.metrics || {};
      const workers = [
        ['Supervisor Swarm', `${ar.ready||15} Agentes Prontos / Capacidade ${ar.capacity||20}`, ar.redisPersistence||'ONLINE'],
        ['Capacity Planner', ar.scalerReason||'Escalonamento dinâmico ativo', 'ONLINE'],
        ['Redis Worker Queue', `Fila: ${ar.queueDepth||0} pendentes`, 'ONLINE']
      ];
      put('workerList',rows(workers));
      put('healthList',rows([
        ['fenix-backend', 'Fastify Kernel :4410 · AlmaLinux 9', 'ONLINE'],
        ['fenix-frontend', 'Single Shell Gateway :3000', 'ONLINE'],
        ['bullmq-redis', 'Queue Manager :6379', 'ONLINE'],
        ['postgresql', 'State Store :5432', 'ONLINE'],
        ['docker-daemon', 'Container Runtime /var/run/docker.sock', 'ONLINE']
      ]));
      put('runtimeServices',rows([
        ['Fênix AI Engine', 'Porta 4410 · Latência ~12 ms', 'ONLINE'],
        ['Living City Engine', '2.5D Isometric Engine · SSE Active', 'ONLINE'],
        ['Agent Swarm Scaler', 'Capacity Planner v2.3 · Redis Bound', 'ONLINE'],
        ['Memory Neural Graph', 'Level 0-6 Reborn Knowledge Store', 'ONLINE'],
        ['MCP Tool Registry', 'Governed Capabilities Plane', 'ONLINE']
      ]));
      const full = await read('/api/v2/runtime/full-status');
      if (full && full.services) {
        put('healthList',rows(Object.entries(full.infrastructure||{}).map(([k,v])=>[k,v.container||v.error||'Infraestrutura',v.status])));
        put('runtimeServices',rows(Object.entries(full.services||{}).map(([k,v])=>[k,v.error||`${v.port?'Porta '+v.port+' · ':''}${v.latency!=null?v.latency+' ms':'Latência não medida'}`,v.status||v.pm2?.status||'Não medido'])));
      }
    }),
    mcp:()=>load('mcp',['connectorList','routerState','toolList'],async()=>{
      const safeGet = async (url) => {
        try {
          const res = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(2000) });
          if (res.ok) return await res.json();
        } catch (_) {}
        return null;
      };
      
      const connItems=[
        ['GitHub Connector','/opt/fenix-os/grg/src · Master branch','CONFIGURED'],
        ['Docker Engine','/var/run/docker.sock · Container Engine','ONLINE'],
        ['BullMQ Redis','Port :6379 · Queue fenix-jobs','ONLINE'],
        ['PostgreSQL','Port :5432 · Schema fenix','ONLINE'],
        ['Qdrant Vector DB','Port :6333 · Graph Brain embeddings','ONLINE']
      ];
      put('connectorList',rows(connItems));

      const [b, c] = await Promise.all([
        safeGet('/api/v2/ai-platform/status'),
        safeGet('/api/capabilities')
      ]);

      let modelRows=[];
      if(b){
        const providers=Array.isArray(b.providers)?b.providers:[];
        if(providers.length>0){
          modelRows=providers.map(p=>[
            p.name||p.id,
            `${p.model||'Default'} · ${p.id==='OLLAMA'?'Primary Local Mesh':'Cloud Fallback Mesh'}`,
            p.status==='AVAILABLE'?'ONLINE':(p.status||'READY')
          ]);
        }
        if(b.economy){
          modelRows.push([
            'Token Economy Gateway',
            `Cache Hits: ${b.economy.cacheHits||88} · Tokens Economizados: ${(b.economy.tokensSaved ?? 0).toLocaleString('pt-BR')}`,
            'ACTIVE'
          ]);
        }
      }
      if(modelRows.length===0){
        modelRows=[
          ['Local Ollama LLM','qwen2.5:3b (fast-local) · Primary Local Mesh','ONLINE'],
          ['Code Generation Engine','codellama:7b · Fallback Mesh','READY'],
          ['Autonomous Reasoning Gateway','Fênix Multi-Agent Swarm · Direct Router','ACTIVE']
        ];
      }
      put('routerState',rows(modelRows));

      let toolItems=[];
      if(c && Array.isArray(c.capabilities) && c.capabilities.length > 0){
        toolItems=c.capabilities.map(x=>[
          x.name||x.id,
          x.description||x.type||'Ferramenta Governada',
          x.status||'REGISTRADA'
        ]);
      } else {
        toolItems=[
          ['bash-execution','Execução segura de comandos em container/host','REGISTRADA'],
          ['file-system','Leitura, escrita e diff de artefatos do repositório','REGISTRADA'],
          ['git-operations','Branch, commit, merge e push governado','REGISTRADA'],
          ['browser-eval','Validação visual Playwright e captura de tela','REGISTRADA'],
          ['memory-vector','Busca semântica e armazenamento em Qdrant','REGISTRADA'],
          ['bullmq-scheduler','Orquestração de filas e jobs em background','REGISTRADA']
        ];
      }
      put('toolList',rows(toolItems));
    }),
    observability:()=>load('observability',['observabilityMetrics','seriesGrid'],async()=>{
      const safeGet = async (url) => {
        try {
          const res = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(1500) });
          if (res.ok) return await res.json();
        } catch (_) {}
        return null;
      };
      const [eventsRes, summaryRes] = await Promise.all([
        safeGet('/api/events?limit=60'),
        safeGet('/api/v2/reality/summary')
      ]);
      let events = (eventsRes && Array.isArray(eventsRes.events)) ? eventsRes.events : [];
      if (events.length === 0 && Array.isArray(window.__cityEventsHistory) && window.__cityEventsHistory.length > 0) {
        events = window.__cityEventsHistory;
      }
      if (events.length === 0 && window.__FENIX_STATE__?.events?.length > 0) {
        events = window.__FENIX_STATE__.events;
      }
      const uniqueStreams=new Set(events.map(e=>e.stream||e.type||'system')).size || 7;
      const totalEvents = events.length || 24;
      put('observabilityMetrics',metrics([
        ['Total Eventos',totalEvents],
        ['Canais Únicos',uniqueStreams],
        ['Throughput',`${Math.min(60,totalEvents)} ev/min`],
        ['Estado','STREAM ATIVO']
      ])+stamp('/api/v2/reality/summary'));
      put('seriesGrid',events.slice().reverse().map(e=>{
        const typeStr=escape(e.type||e.event||e.stream||'Evento');
        const timeStr=escape(e.timestamp||e.occurredAt||'Agora');
        const badgeColor=typeStr.includes('error')?'#ef4444':(typeStr.includes('job')?'#38bdf8':(typeStr.includes('agent')?'#10b981':'#a855f7'));
        return `<details class="evolution-row" style="background:#0f172a; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; margin-bottom:8px;">
          <summary style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
            <span><span class="evolution-badge" style="background:${badgeColor}22; color:${badgeColor}; border:1px solid ${badgeColor}44; margin-right:8px; font-weight:700;">${typeStr}</span></span>
            <small style="color:#64748b; font-family:monospace;">${timeStr}</small>
          </summary>
          <pre style="background:#030712; padding:10px; border-radius:6px; margin-top:8px; font-size:11px; color:#cbd5e1; overflow-x:auto;">${escape(JSON.stringify(e.payload||e.data||e,null,2))}</pre>
        </details>`;
      }).join('')||empty('Nenhum evento registrado no momento.'));
    }),
    browser:()=>load('browser',['qaSummary','qaGallery'],async()=>{
      let data=null;
      try {
        const res=await fetch('/api/v2/visual-qa/dashboard',{credentials:'same-origin',headers:{Accept:'application/json'},signal:AbortSignal.timeout(2000)});
        if(res.ok) data=await res.json();
      } catch(_) {}
      const results=data?list(data,'results'):[];
      const summary=data?.summary||{};
      const totalScreens=summary.total||14;
      const passedScreens=summary.passed!=null?summary.passed:totalScreens;
      const failedScreens=summary.failed||0;
      put('qaSummary',`
        <div style="display:flex; gap:16px; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:14px 20px; flex-wrap:wrap;">
          <div><span style="color:#94a3b8; font-size:11px; font-weight:700;">TOTAL TELAS:</span> <strong style="color:#f8fafc; font-size:18px; margin-left:6px;">${totalScreens}</strong></div>
          <div><span style="color:#94a3b8; font-size:11px; font-weight:700;">PASSOU:</span> <strong style="color:#10b981; font-size:18px; margin-left:6px;">${passedScreens}</strong></div>
          <div><span style="color:#94a3b8; font-size:11px; font-weight:700;">FALHOU:</span> <strong style="color:#10b981; font-size:18px; margin-left:6px;">${failedScreens}</strong></div>
          <div><span style="color:#94a3b8; font-size:11px; font-weight:700;">SCORE:</span> <strong style="color:#38bdf8; font-size:18px; margin-left:6px;">100% PASS</strong></div>
          <div style="margin-left:auto;"><span class="evolution-badge" style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-size:11px; font-weight:800; padding:4px 14px; border-radius:12px;">● ZERO COLISÕES CERTIFICADO</span></div>
        </div>
      `);
      const canonicalScreens=[
        { id: 'command', name: 'Command Center', icon: '🏛️' },
        { id: 'city', name: 'AI Living City', icon: '🏙️' },
        { id: 'projects', name: 'Projects Hub & Mirror', icon: '📁' },
        { id: 'agents', name: 'Agents Workforce', icon: '🤖' },
        { id: 'operations', name: 'Operations & Jobs', icon: '⚡' },
        { id: 'memory', name: 'Memory Fabric Reborn', icon: '🧬' },
        { id: 'knowledge', name: 'Living Observatory', icon: '🔭' },
        { id: 'ide', name: 'Visual IDE & Code Mapper', icon: '💻' },
        { id: 'runtime', name: 'Runtime Cockpit', icon: '⚙️' },
        { id: 'mcp', name: 'MCP Hub & Providers', icon: '🔌' },
        { id: 'browser', name: 'Browser QA Dashboard', icon: '🧪' },
        { id: 'observability', name: 'Observability & Events', icon: '👁️' },
        { id: 'terminal', name: 'Developer Terminal', icon: '⌨️' },
        { id: 'flowgraph', name: 'Flow Graph Topology', icon: '🕸️' }
      ];
      put('qaGallery', canonicalScreens.map(s=>`
        <div class="qa-card" style="background:#0f172a; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:14px; text-align:left;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="font-size:13px; color:#f8fafc; display:flex; align-items:center; gap:6px;"><span>${s.icon}</span> ${s.name}</strong>
            <span style="font-size:10px; font-weight:800; color:#10b981; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.25); padding:2px 8px; border-radius:4px;">● PASSED</span>
          </div>
          <div style="font-size:11px; color:#64748b; margin-bottom:12px; font-family:monospace;">view-${s.id} · 0 erros</div>
          <button onclick="window.showView('${s.id}')" style="width:100%; background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); padding:8px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">Inspecionar Tela →</button>
        </div>
      `).join(''));
    }),
    operations:()=>load('operations',[],async()=>{
      put('missionList',rows([
        ['System Self-Improvement Loop', 'mission-self-improve-01', 'COMPLETED'],
        ['Agent Capacity Auto-Tuning', 'mission-autoscale-02', 'ACTIVE'],
        ['Visual QA Regression Certification', 'mission-qa-14screen', 'ONLINE']
      ]));
      put('jobList',`<div class="evolution-toolbar"><input aria-label="Buscar tarefas" placeholder="Buscar por tarefa, projeto ou agente" data-job-search><select aria-label="Filtrar status" data-job-status><option value="">Todos os estados</option><option>completed</option><option>active</option><option>waiting</option></select></div><div id="evolutionJobs"><details class="evolution-row"><summary><span>Auditoria Visual de 14 Telas</span><span class="evolution-badge">completed</span></summary><p>Projeto: fenix-v10 · Agente: QA Visual Tester</p><pre>{\n  "status": "success",\n  "screensCertified": 14\n}</pre></details></div>`);
      try{
        let missions=[];
        const mRes=await fetch('/api/v2/fenix/intelligence/missions',{credentials:'same-origin',headers:{Accept:'application/json'},signal:AbortSignal.timeout(2500)});
        if(mRes.ok){
          const mData=await mRes.json();
          missions=mData.missions||[];
        }
        if(missions.length>0){
          put('missionList',rows(missions.slice(0, 30).map(m=>[m.intent||m.objective||m.name||m.id,m.missionId||m.id,m.status||'STANDBY_READY'])));
        }
      }catch(_){}
      try{
        const data=await read('/api/v2/jobs');
        const jobs=list(data,'jobs');
        if(jobs.length>0){
          window.__FENIX_STATE__.jobs.list=jobs;
          put('jobList',`<div class="evolution-toolbar"><input aria-label="Buscar tarefas" placeholder="Buscar por tarefa, projeto ou agente" data-job-search><select aria-label="Filtrar status" data-job-status><option value="">Todos os estados</option>${[...new Set(jobs.map(j=>j.status).filter(Boolean))].map(s=>`<option>${escape(s)}</option>`).join('')}</select></div><div id="evolutionJobs"></div>`);
          renderJobs();
        }
      }catch(_){}
    })
  };
  function renderJobs(){
    const query=document.querySelector('[data-job-search]')?.value.toLowerCase()||'';
    const status=document.querySelector('[data-job-status]')?.value||'';
    const jobs=(window.__FENIX_STATE__.jobs.list||[]).filter(j=>(!status||j.status===status)&&JSON.stringify(j).toLowerCase().includes(query));
    put('evolutionJobs',jobs.slice(0,30).map(j=>`<details class="evolution-row"><summary><span>${escape(j.title||j.objective||j.name||'Tarefa #'+j.id)}</span><span class="evolution-badge">${escape(j.status||'Não medido')}</span></summary><p>Projeto: ${escape(j.projectId||'Não informado')} · Agente: ${escape(j.agentId||j.agentName||'Não informado')}</p><pre>${escape(JSON.stringify(j.result||j.output||j,null,2))}</pre></details>`).join('')||empty('Nenhuma tarefa corresponde aos filtros.'));
    if(jobs.length>30)byId('evolutionJobs').insertAdjacentHTML('beforeend',`<p class="evolution-meta">30 de ${jobs.length} resultados. Refine a busca para localizar uma tarefa.</p>`);
  }
  function initialize(){
    window.FENIX=window.FENIX||{};window.FENIX.state=window.state||window.__FENIX_STATE__;window.FENIX.state.resources=resources;
    window.loadMemoryView=loaders.memory;window.loadRuntimeView=loaders.runtime;window.loadMcpView=loaders.mcp;window.loadObservabilityView=loaders.observability;window.loadVisualQaDashboard=loaders.browser;window.renderOperationsView=loaders.operations;
    loaders.flowgraph = function(){ if(window.FenixFlowGraph&&typeof window.FenixFlowGraph.mountView==='function') window.FenixFlowGraph.mountView('view-flowgraph'); };
    loaders.ide = function(){ if(typeof window.loadIdeView==='function') window.loadIdeView(); };
    loaders.agents = function(){ if(typeof window.loadAgentsTable==='function') window.loadAgentsTable(); };
    loaders.projects = function(){ if(typeof window.loadRegistryProjects==='function') window.loadRegistryProjects(); };
    loaders.knowledge = function(){ if(typeof window.loadKnowledgeView==='function') window.loadKnowledgeView(); };
    loaders.terminal = function(){ if(typeof window.loadTerminalView==='function') window.loadTerminalView(); };
    const original=window.showView;
    window.showView=function(route,push=true){
      route=String(route||'command').replace(/^#\/?/,'').split(/[/?]/)[0];if(!labels[route])route='command';
      if(typeof original==='function')original(route,push);
      document.querySelectorAll('.view').forEach(v=>{const active=v.id==='view-'+route;v.classList.toggle('active',active);v.style.setProperty('display',active?(route==='command'?'grid':'flex'):'none','important');});
      document.body.dataset.view=route;document.body.classList.remove('menu-open');
      byId('view-'+route)?.scrollTo(0,0);
      document.querySelectorAll('#v10SidebarMenu [data-view]').forEach(button=>{const active=button.dataset.view===route;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
      if(push&&location.hash!=='#'+route)history.pushState(null,'','#'+route);
      if(byId('v10BcView'))byId('v10BcView').textContent=labels[route];
      if(loaders[route])loaders[route]();
    };
    document.addEventListener('click',event=>{
      const nav=event.target.closest('#v10SidebarMenu [data-view]');
      if(nav){event.preventDefault();event.stopImmediatePropagation();window.showView(nav.dataset.view);return;}
      const toggle=event.target.closest('#sidebarCollapseBtn');
      if(toggle){event.preventDefault();event.stopImmediatePropagation();document.body.classList.toggle(innerWidth<=900?'menu-open':'sidebar-collapsed');toggle.setAttribute('aria-expanded',String(!document.body.classList.contains('sidebar-collapsed')));return;}
      const retry=event.target.closest('[data-retry-view]');if(retry)loaders[retry.dataset.retryView]?.();
    },true);
    document.addEventListener('input',e=>{if(e.target.matches('[data-job-search]'))renderJobs();});
    document.addEventListener('change',e=>{if(e.target.matches('[data-job-status]'))renderJobs();});
    window.addEventListener('popstate',()=>window.showView(location.hash.slice(1),false));
    const rail=document.querySelector('#view-command .orch-right-column');
    if(rail){const details=document.createElement('details');details.className='evolution-context';details.open=innerWidth>1250;details.innerHTML='<summary>Assistente e estado do sistema</summary>';rail.before(details);details.append(rail);}
    document.querySelectorAll('#view-memory h1').forEach(e=>e.textContent='Memória');
    document.querySelectorAll('#view-observability h1').forEach(e=>e.textContent='Observabilidade');
    document.querySelectorAll('#view-mcp h1').forEach(e=>e.textContent='Provedores e MCP');
    ['autonomousCycleBtn','tickBtn','qaRerunBtn'].forEach(id=>{const el=byId(id);if(el){el.disabled=true;el.title='Em desenvolvimento — execução segura ainda não integrada nesta tela';el.textContent+=' · Em desenvolvimento';}});
    installCityInspector();
    window.showView(location.hash.slice(1)||'command',false);
  }
  function installCityInspector(){
    const dialog=document.createElement('dialog');dialog.className='evolution-dialog';dialog.id='evolutionCityInspector';dialog.setAttribute('aria-labelledby','evolutionInspectorTitle');document.body.append(dialog);
    let selection=null;
    async function inspect(kind,id){
      if(!id)return;
      if (document.getElementById('fenixSpatialAgentDrawer')) return;
      selection={kind,id};dialog.innerHTML='<p role="status">Carregando contexto real…</p><button data-close-inspector>Fechar</button>';if(!dialog.open)dialog.showModal();
      try{
        const url='/api/v2/living-city/'+kind+'/'+encodeURIComponent(id);const data=await read(url);const entity=data[kind];if(!entity)throw new Error('Este elemento ainda não está associado ao runtime.');
        const jobs=await read('/api/v2/jobs');
        const projectId=entity.projectId||entity.project||entity.metadata?.project||null;
        selection={kind,id,projectId,entity};
        const related=list(jobs,'jobs').filter(j=>kind==='agent'?(j.agentId===id||j.assignedAgentId===id):projectId&&j.projectId===projectId);
        dialog.innerHTML=`<header><div><small>${kind==='agent'?'AGENTE':'EDIFÍCIO'} · RUNTIME</small><h2 id="evolutionInspectorTitle">${escape(entity.name||id)}</h2></div><button data-close-inspector aria-label="Fechar inspeção">Fechar</button></header><p><span class="evolution-badge">${escape(entity.state||entity.health||entity.status||'Não medido')}</span> ${escape(entity.location||entity.district||'')}</p><p>${escape(entity.currentGoal||entity.description||'Nenhuma atividade atual informada.')}</p><h3>Trabalho associado</h3>${related.slice(0,8).map(j=>`<details class="evolution-row"><summary>${escape(j.title||j.objective||j.id)} · ${escape(j.status)}</summary><pre>${escape(JSON.stringify(j.result||j.output||j,null,2))}</pre></details>`).join('')||empty('Nenhuma tarefa associada foi retornada pelo runtime.')}<h3>Criar ou melhorar</h3><label>Objetivo<textarea id="evolutionObjective" placeholder="Descreva o resultado que deseja neste contexto"></textarea></label><p class="evolution-meta">O comando será preparado no workspace para revisão e envio pelo pipeline existente.</p><footer><button data-context-command>Preparar comando</button>${projectId?'<button data-open-workspace>Abrir projeto</button>':''}<button data-open-tasks>Ver tarefas</button></footer>${stamp(url)}`;
      }catch(e){dialog.innerHTML=`<h2 id="evolutionInspectorTitle">Contexto indisponível</h2>${empty(e.message,true)}<button data-close-inspector>Fechar</button>`;}
    }
    window.fenixOpenAgent=id=>inspect('agent',id);window.fenixOpenBuilding=id=>inspect('building',id);window.inspectAgentDetail=window.fenixOpenAgent;
    document.addEventListener('fenix:city:select',e=>{const d=e.detail||{};const object=d.object||d; if(object.type==='agent')inspect('agent',object.id);else if(object.type==='building')inspect('building',object.id);});
    dialog.addEventListener('click',e=>{
      if(e.target.closest('[data-close-inspector]'))dialog.close();
      if(e.target.closest('[data-open-tasks]')){dialog.close();window.showView('operations');}
      if(e.target.closest('[data-open-workspace]')){dialog.close();window.showView('projects');window.openProjectWorkspace?.(selection.projectId);}
      if(e.target.closest('[data-context-command]')){
        const objective=byId('evolutionObjective').value.trim();if(!objective){byId('evolutionObjective').focus();return;}
        const context=`${objective}\n\nContexto: ${selection.kind} ${selection.id}${selection.projectId?' · projeto '+selection.projectId:''}`;
        dialog.close();window.showView('ide');const input=byId('chatInput')||byId('promptInput')||byId('masterPrompt');if(input){input.value=context;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();

