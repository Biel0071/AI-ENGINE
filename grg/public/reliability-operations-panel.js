'use strict';
/**
 * FÊNIX OS — Level 27: Self-Healing Reliability Cockpit
 * ======================================================
 * Canonical SRE operational panel for:
 * 1. Live Service Availability & Health Matrix
 * 2. Real API Latency & Error Rate Telemetry
 * 3. Real Job Queue & Agent Workforce Status
 * 4. Circuit Breakers State & Fallbacks
 * 5. System Resources (Process Memory, OS RAM, CPU) & SSE Reconnections
 * 6. Automated Recovery Incident Ledger
 * 7. Human Escalation Approval Gate
 *
 * 100% Zero-Mock Compliance: All data is hydrated from /api/v2/reliability/status
 * and /api/v2/reliability/incidents. Unmeasured initial slots display '—'.
 */

(function () {
  const state = {
    loading: false,
    statusData: null,
    incidentsData: null,
    error: null,
    lastFetchedAt: null,
    autoRefreshTimer: null
  };

  function getAuthHeader() {
    const token = window.localStorage?.getItem('grg_token') ||
                  window.localStorage?.getItem('fenix_token') ||
                  window.sessionStorage?.getItem('grg_token') ||
                  (document.cookie.match(/fenix_session=([^;]+)/) || [])[1] || '';
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async function apiFetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers || {})
    };
    const res = await fetch(endpoint, { ...options, headers });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status} em ${endpoint}`);
    }
    return res.json();
  }

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(isoStr) {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (_) {
      return isoStr;
    }
  }

  async function loadData() {
    state.loading = true;
    try {
      const [status, incidents] = await Promise.all([
        apiFetch('/api/v2/reliability/status'),
        apiFetch('/api/v2/reliability/incidents?limit=25')
      ]);
      state.statusData = status;
      state.incidentsData = incidents;
      state.error = null;
      state.lastFetchedAt = new Date().toISOString();
    } catch (err) {
      state.error = err.message;
    } finally {
      state.loading = false;
      render();
    }
  }

  function render() {
    const container = document.getElementById('fenixReliabilitySection');
    if (!container) return;

    const data = state.statusData;
    const incidents = state.incidentsData?.incidents || [];
    const escalatedList = incidents.filter(i => i.state === 'ESCALATED');

    if (state.error && !data) {
      container.innerHTML = `
        <div style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:16px; color:#fca5a5; font-size:13px;">
          <strong>Falha ao carregar telemetria de confiabilidade:</strong> ${esc(state.error)}
          <button onclick="window.fenixReliability.refresh()" style="margin-left:12px; background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer;">Tentar novamente</button>
        </div>
      `;
      return;
    }

    // Top Level Values (Zero-Mock: use '—' if absent)
    const isHealthy = data?.status === 'HEALTHY';
    const statusColor = isHealthy ? '#10b981' : '#f59e0b';
    const statusText = data?.status || '—';
    const avgLatency = data?.telemetry?.latency?.avgMs != null ? `${data.telemetry.latency.avgMs} ms` : '—';
    const p95Latency = data?.telemetry?.latency?.p95Ms != null ? `${data.telemetry.latency.p95Ms} ms` : '—';
    const errorRate = data?.telemetry?.errorRatePct != null ? `${data.telemetry.errorRatePct}%` : '—';
    const totalRecoveries = data?.recoveries?.recoveredIncidents ?? '—';
    const activeIncidents = data?.recoveries?.activeIncidents ?? '—';
    const runningJobs = data?.jobs?.running ?? '—';
    const totalJobs = data?.jobs?.total ?? '—';
    const availableAgents = data?.agents?.available ?? '—';
    const totalAgents = data?.agents?.total ?? '—';
    const sseReconnects = data?.services?.sse?.reconnects ?? '—';
    const sseClients = data?.services?.sse?.activeClients ?? '—';
    const processRam = data?.telemetry?.systemResources?.processMemory?.rssMb != null ? `${data.telemetry.systemResources.processMemory.rssMb} MB` : '—';
    const osRamUsed = data?.telemetry?.systemResources?.osMemory?.usedPct != null ? `${data.telemetry.systemResources.osMemory.usedPct}%` : '—';

    // Services matrix
    const s = data?.services || {};
    const services = [
      { name: 'Backend API', status: s.backend?.status || '—', detail: avgLatency !== '—' ? `${avgLatency} avg` : 'Porta 4400/4410' },
      { name: 'Redis Cache', status: s.redis?.status || '—', detail: s.redis?.status === 'ONLINE' ? 'Conectado :6379' : 'Degradado / In-Memory' },
      { name: 'BullMQ Queues', status: s.bullmq?.status || '—', detail: s.bullmq?.status === 'ONLINE' ? 'Ativo (concurrency: 1)' : 'Bypass / In-Memory' },
      { name: 'PostgreSQL Relational', status: s.postgres?.status || '—', detail: s.postgres?.status === 'ONLINE' ? 'Conectado :5433' : 'Fallback Local' },
      { name: 'API Platform Gateway', status: s.apiPlatform?.status || '—', detail: 'Fastify + BullMQ' },
      { name: 'Ollama Host', status: s.ollama?.status || '—', detail: 'Local CPU :11434' },
      { name: 'SSE Event Stream', status: s.sse?.status || '—', detail: `${sseClients} clientes / ${sseReconnects} reconexões` }
    ];

    // Circuit Breakers
    const breakers = data?.circuitBreakers || {};

    let html = `
      <div class="fenix-reliability-cockpit" style="display:flex; flex-direction:column; gap:16px; padding:16px 20px; font-family:var(--font-sans, system-ui, sans-serif);">

        <!-- Header / Controls Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:#0B1018; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px 18px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:10px; height:10px; border-radius:50%; background:${statusColor}; box-shadow:0 0 10px ${statusColor};"></div>
            <div>
              <span style="font-size:14px; font-weight:800; color:#F8FAFC; letter-spacing:0.5px;">SRE &amp; SELF-HEALING RELIABILITY ENGINE</span>
              <span style="font-size:11px; color:#94A3B8; margin-left:8px;">Estado: <strong style="color:${statusColor}">${statusText}</strong></span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; color:#64748B;">Última verificação: ${formatTime(state.lastFetchedAt)}</span>
            <button onclick="window.fenixReliability.runWatchdog()" style="background:rgba(0,217,255,0.12); color:#00D9FF; border:1px solid rgba(0,217,255,0.3); padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px;">
              <i class="ph-bold ph-shield-check"></i> Executar Watchdog
            </button>
            <button onclick="window.fenixReliability.refresh()" style="background:rgba(255,255,255,0.06); color:#E2E8F0; border:1px solid rgba(255,255,255,0.1); padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer;">
              <i class="ph ph-arrows-clockwise"></i> Atualizar
            </button>
          </div>
        </div>

        <!-- Human Escalation Alert Banner (Only visible if there are escalated items) -->
        ${escalatedList.length > 0 ? `
          <div style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; border-radius:8px; padding:14px 18px; color:#FEE2E2;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <i class="ph-bold ph-warning-octagon" style="color:#ef4444; font-size:18px;"></i>
                <strong style="color:#fff; font-size:13px;">APROVAÇÃO HUMANA OBRIGATÓRIA: ${escalatedList.length} FALHA(S) CRÍTICA(S) AGUARDANDO DECISÃO</strong>
              </div>
              <span style="font-size:11px; color:#fca5a5;">Ciclo de reinicializações automáticas interrompido para proteção do sistema.</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${escalatedList.map(item => `
                <div style="background:#090D16; border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <span style="background:#ef4444; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">${esc(item.component)}</span>
                    <strong style="color:#F8FAFC; margin-left:8px; font-size:12px;">${esc(item.failureType)}</strong>
                    <div style="font-size:11px; color:#94A3B8; margin-top:2px;">${esc(item.rootCause)} · ${esc(item.escalationReason || '')}</div>
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button onclick="window.fenixReliability.resolveEscalation('${esc(item.incidentId)}', 'retry')" style="background:#10b981; color:#fff; border:none; padding:4px 10px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;">
                      Aprovar Reprocessamento
                    </button>
                    <button onclick="window.fenixReliability.resolveEscalation('${esc(item.incidentId)}', 'fallback')" style="background:#f59e0b; color:#fff; border:none; padding:4px 10px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;">
                      Ativar Rota Fallback
                    </button>
                    <button onclick="window.fenixReliability.resolveEscalation('${esc(item.incidentId)}', 'cancel')" style="background:rgba(255,255,255,0.1); color:#E2E8F0; border:1px solid rgba(255,255,255,0.2); padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer;">
                      Cancelar Tarefa
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Top SRE KPIs Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
          <div style="background:#0B1018; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Latência Média API</div>
            <div style="font-size:22px; font-weight:800; color:#00D9FF; margin-top:4px;">${avgLatency}</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:2px;">p95: ${p95Latency}</div>
          </div>
          <div style="background:#0B1018; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Taxa de Erros HTTP</div>
            <div style="font-size:22px; font-weight:800; color:${errorRate === '0%' ? '#10b981' : '#f59e0b'}; margin-top:4px;">${errorRate}</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:2px;">Últimas 100 requisições</div>
          </div>
          <div style="background:#0B1018; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Autorrecuperações</div>
            <div style="font-size:22px; font-weight:800; color:#10b981; margin-top:4px;">${totalRecoveries}</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:2px;">${activeIncidents} incidente(s) ativo(s)</div>
          </div>
          <div style="background:#0B1018; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Fila &amp; Jobs Ativos</div>
            <div style="font-size:22px; font-weight:800; color:#F8FAFC; margin-top:4px;">${runningJobs} <span style="font-size:13px; color:#64748B;">/ ${totalJobs}</span></div>
            <div style="font-size:11px; color:#94A3B8; margin-top:2px;">${data?.jobs?.pending ?? '—'} na fila · ${data?.jobs?.stalled ?? '—'} travados</div>
          </div>
          <div style="background:#0B1018; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Agentes Disponíveis</div>
            <div style="font-size:22px; font-weight:800; color:#10b981; margin-top:4px;">${availableAgents} <span style="font-size:13px; color:#64748B;">/ ${totalAgents}</span></div>
            <div style="font-size:11px; color:#94A3B8; margin-top:2px;">${data?.agents?.working ?? '—'} ocupados · ${data?.agents?.blocked ?? '—'} bloqueados</div>
          </div>
          <div style="background:#0B1018; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; color:#64748B; font-weight:700; text-transform:uppercase;">Recursos Processo</div>
            <div style="font-size:22px; font-weight:800; color:#F8FAFC; margin-top:4px;">${processRam}</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:2px;">OS RAM: ${osRamUsed}</div>
          </div>
        </div>

        <!-- Middle Section: Service Matrix & Circuit Breakers -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">

          <!-- Subsystem Availability Matrix -->
          <div style="background:#0B1018; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:14px 18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 style="margin:0; font-size:13px; font-weight:800; color:#F8FAFC; letter-spacing:0.5px;">MATRIZ DE DISPONIBILIDADE REAL DOS SERVIÇOS</h3>
              <span style="font-size:10px; color:#10b981; font-weight:700; background:rgba(16,185,129,0.1); padding:2px 8px; border-radius:10px;">ZERO-MOCK SRE</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${services.map(svc => {
                const isOnline = svc.status === 'ONLINE';
                const pillBg = isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)';
                const pillColor = isOnline ? '#10b981' : '#f59e0b';
                return `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:6px;">
                    <div>
                      <strong style="color:#F8FAFC; font-size:12px;">${esc(svc.name)}</strong>
                      <div style="font-size:11px; color:#64748B;">${esc(svc.detail)}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:11px; font-weight:800; padding:3px 8px; border-radius:4px; background:${pillBg}; color:${pillColor};">${esc(svc.status)}</span>
                      <button onclick="window.fenixReliability.triggerRecovery('${esc(svc.name.toLowerCase().split(' ')[0])}')" title="Testar / Reiniciar cirurgicamente" style="background:transparent; border:1px solid rgba(255,255,255,0.1); color:#94A3B8; border-radius:4px; padding:3px 6px; cursor:pointer; font-size:11px;">
                        <i class="ph ph-arrows-clockwise"></i>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Circuit Breakers Matrix -->
          <div style="background:#0B1018; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:14px 18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 style="margin:0; font-size:13px; font-weight:800; color:#F8FAFC; letter-spacing:0.5px;">CIRCUIT BREAKERS &amp; RESILIÊNCIA</h3>
              <span style="font-size:10px; color:#00D9FF; font-weight:700; background:rgba(0,217,255,0.1); padding:2px 8px; border-radius:10px;">PROTEÇÃO CONTRA CASCATA</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${Object.values(breakers).map(cb => {
                const isClosed = cb.state === 'CLOSED';
                const isHalfOpen = cb.state === 'HALF_OPEN';
                const cbBg = isClosed ? 'rgba(16,185,129,0.15)' : isHalfOpen ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';
                const cbColor = isClosed ? '#10b981' : isHalfOpen ? '#f59e0b' : '#ef4444';
                return `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:6px;">
                    <div>
                      <strong style="color:#F8FAFC; font-size:12px;">${esc(cb.name)}</strong>
                      <div style="font-size:11px; color:#64748B;">Falhas: ${cb.failures ?? 0} · Fallback: ${cb.fallbackActive ? 'ATIVO' : 'Inativo'}</div>
                    </div>
                    <span style="font-size:11px; font-weight:800; padding:3px 8px; border-radius:4px; background:${cbBg}; color:${cbColor};">${esc(cb.state)}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Bottom Section: Self-Healing Incident & Recovery Ledger -->
        <div style="background:#0B1018; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:14px 18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div>
              <h3 style="margin:0; font-size:13px; font-weight:800; color:#F8FAFC; letter-spacing:0.5px;">LIVRO DE REGISTRO DE INCIDENTES &amp; AUTORRECUPERAÇÃO</h3>
              <div style="font-size:11px; color:#64748B; margin-top:2px;">Histórico factual auditável com causa-raiz, ação corretiva e resultado.</div>
            </div>
            <span style="font-size:11px; color:#94A3B8;">${incidents.length} incidentes registrados</span>
          </div>

          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
              <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.08); color:#64748B;">
                  <th style="padding:8px 10px;">DETECTADO</th>
                  <th style="padding:8px 10px;">COMPONENTE</th>
                  <th style="padding:8px 10px;">TIPO DE FALHA</th>
                  <th style="padding:8px 10px;">CAUSA RAIZ</th>
                  <th style="padding:8px 10px;">AÇÃO DE RECUPERAÇÃO</th>
                  <th style="padding:8px 10px;">DURAÇÃO</th>
                  <th style="padding:8px 10px; text-align:right;">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                ${incidents.length > 0 ? incidents.slice(0, 15).map(inc => {
                  const isRec = inc.state === 'RECOVERED';
                  const isEsc = inc.state === 'ESCALATED';
                  const badgeBg = isRec ? 'rgba(16,185,129,0.15)' : isEsc ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)';
                  const badgeColor = isRec ? '#10b981' : isEsc ? '#ef4444' : '#f59e0b';
                  const durText = inc.durationMs != null ? `${inc.durationMs}ms` : '—';
                  return `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04); color:#CBD5E1;">
                      <td style="padding:8px 10px; font-family:monospace; color:#94A3B8;">${formatTime(inc.detectedAt)}</td>
                      <td style="padding:8px 10px;"><strong style="color:#F8FAFC;">${esc(inc.component)}</strong></td>
                      <td style="padding:8px 10px;">${esc(inc.failureType)}</td>
                      <td style="padding:8px 10px; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(inc.rootCause)}">${esc(inc.rootCause)}</td>
                      <td style="padding:8px 10px; color:#38BDF8;">${esc(inc.recoveryAction || 'Em análise')}</td>
                      <td style="padding:8px 10px; font-family:monospace;">${durText}</td>
                      <td style="padding:8px 10px; text-align:right;">
                        <span style="font-size:10px; font-weight:800; padding:2px 8px; border-radius:4px; background:${badgeBg}; color:${badgeColor};">${esc(inc.state)}</span>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="7" style="padding:24px; text-align:center; color:#64748B;">Nenhum incidente registrado no momento. Sistema operando em estabilidade nominal.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    container.innerHTML = html;
  }

  // Public interactive API on window
  window.fenixReliability = {
    refresh: loadData,
    runWatchdog: async function () {
      try {
        await apiFetch('/api/v2/reliability/watchdog/run', { method: 'POST' });
        await loadData();
      } catch (err) {
        alert('Erro ao executar watchdog: ' + err.message);
      }
    },
    triggerRecovery: async function (component) {
      try {
        await apiFetch('/api/v2/reliability/recover', {
          method: 'POST',
          body: JSON.stringify({ component })
        });
        await loadData();
      } catch (err) {
        alert('Erro ao disparar recuperação: ' + err.message);
      }
    },
    resolveEscalation: async function (incidentId, action) {
      try {
        await apiFetch(`/api/v2/reliability/incidents/${incidentId}/resolve`, {
          method: 'POST',
          body: JSON.stringify({ action })
        });
        await loadData();
      } catch (err) {
        alert('Erro ao resolver escalação: ' + err.message);
      }
    }
  };

  // Initial load when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
  } else {
    loadData();
  }

  // Auto-refresh interval every 10 seconds
  state.autoRefreshTimer = setInterval(() => {
    const section = document.getElementById('fenixReliabilitySection');
    // Only refresh if the section is attached and view is visible
    if (section && section.offsetParent !== null) {
      loadData().catch(() => {});
    }
  }, 10000);
})();
