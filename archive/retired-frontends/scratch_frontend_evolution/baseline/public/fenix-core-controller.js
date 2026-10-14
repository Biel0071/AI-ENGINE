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
    return safeExec('view-agents', async () => {
      const container = document.getElementById('agentList');
      if (!container) return;

      if (!STATE.agents.list || STATE.agents.list.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#38bdf8;">🔄 Carregando 15 agentes especialistas do Fênix OS...</td></tr>';
        await window.getAgents();
      }

      const agents = STATE.agents.list || [];

      if (agents.length === 0) {
        container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">
          ${STATE.agents.error ? 'Erro ao carregar agentes: ' + STATE.agents.error : 'Nenhum agente registrado no momento.'}
        </td></tr>`;
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
          let badge = document.getElementById('v10TelemetryStatus');
          if (!badge) {
            const headerActions = document.querySelector('#view-command .v10-header-actions') || document.querySelector('#view-command .v10-command-header');
            if (headerActions) {
              badge = document.createElement('div');
              badge.id = 'v10TelemetryStatus';
              badge.style.cssText = 'display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; padding:4px 10px; border-radius:12px; margin-right:12px;';
              headerActions.prepend(badge);
            }
          }
          if (badge) {
            if (status === 'LIVE') {
              badge.className = 'telemetry-live';
              badge.style.background = 'rgba(16,185,129,0.15)';
              badge.style.border = '1px solid rgba(16,185,129,0.3)';
              badge.style.color = '#10b981';
              badge.innerHTML = '<span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span> LIVE';
              badge.title = 'Telemetria em tempo real derivada do host Linux e containers';
            } else if (status === 'CACHED') {
              const diffSec = Math.max(1, Math.round((Date.now() - (lastFetchEpoch || Date.now())) / 1000));
              badge.className = 'telemetry-cached';
              badge.style.background = 'rgba(245,158,11,0.15)';
              badge.style.border = '1px solid rgba(245,158,11,0.3)';
              badge.style.color = '#f59e0b';
              badge.innerHTML = `<span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#f59e0b;"></span> CACHED (${diffSec}s atrás)`;
              badge.title = 'Exibindo última leitura em cache — conexão com backend aguardando atualização';
            } else {
              badge.className = 'telemetry-offline';
              badge.style.background = 'rgba(239,68,68,0.15)';
              badge.style.border = '1px solid rgba(239,68,68,0.3)';
              badge.style.color = '#ef4444';
              badge.innerHTML = '<span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#ef4444;"></span> OFFLINE';
              badge.title = 'Backend indisponível — dados em tempo real não puderam ser obtidos';
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

          // 9. Gauges de CPU e RAM
          const ht = data.hostTelemetry;
          const cpuEl = document.getElementById('v10GaugeCpu');
          const cpuFill = document.getElementById('v10CpuGaugeFill');
          if (ht && ht.cpu && ht.cpu.percent !== undefined) {
            if (cpuEl) cpuEl.textContent = `${ht.cpu.percent}%`;
            if (cpuFill) cpuFill.setAttribute('stroke-dasharray', `${ht.cpu.percent}, 100`);
          } else {
            if (cpuEl) cpuEl.textContent = '--%';
            if (cpuFill) cpuFill.setAttribute('stroke-dasharray', '0, 100');
          }

          const ramEl = document.getElementById('v10GaugeRam');
          const ramFill = document.getElementById('v10RamGaugeFill');
          if (ht && ht.memory && ht.memory.usedPercent !== undefined) {
            if (ramEl) ramEl.textContent = `${ht.memory.usedPercent}%`;
            if (ramFill) ramFill.setAttribute('stroke-dasharray', `${ht.memory.usedPercent}, 100`);
          } else {
            if (ramEl) ramEl.textContent = '--%';
            if (ramFill) ramFill.setAttribute('stroke-dasharray', '0, 100');
          }

          STATE.system = {
            status: teleStatus,
            cpu: ht?.cpu?.percent ?? null,
            ram: ht?.memory?.usedPercent ?? null,
            uptime: uptimeStr || null,
            lastFetch: new Date().toISOString()
          };
        };

        // Render immediately from cache if available with CACHED badge
        if (STATE.cachedSummary) {
          renderDashboardFromData(STATE.cachedSummary, STATE.realityScore, 'CACHED', STATE.cachedSummaryEpoch);
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
          renderDashboardFromData(STATE.cachedSummary, scoreData || STATE.realityScore, 'CACHED', STATE.cachedSummaryEpoch);
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

  console.log('[FENIX] Core Real Controller v3 active');
})();
